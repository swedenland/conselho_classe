let coordLogada = null;
let turmasCache = [];

document.addEventListener("DOMContentLoaded", async () => {
  await checkCoordenacao();
  await loadTurmasFiltro();
  await loadConselhos();
});

async function checkCoordenacao() {
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("id, nome, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    alert("Não foi possível carregar seu perfil.");
    window.location.href = "index.html";
    return;
  }

  if (profile.role !== "coordenacao" && profile.role !== "admin") {
    alert("Acesso restrito à coordenação.");
    window.location.href = "dashboard.html";
    return;
  }

  coordLogada = profile;
}

async function loadTurmasFiltro() {
  const { data, error } = await supabaseClient
    .from("turmas")
    .select("id, nome, ano, ensino")
    .order("nome", { ascending: true });

  if (error) {
    console.log(error);
    return;
  }

  turmasCache = data || [];
  renderTurmasFiltro();
}

async function loadConselhos() {
  const ensino = document.getElementById("filtroEnsino").value;
  const turmaId = document.getElementById("filtroTurma").value;
  const bimestre = document.getElementById("filtroBimestre").value;
  const status = document.getElementById("filtroStatus").value;

  // join com turmas para exibir nome/ano/ensino
  let query = supabaseClient
    .from("conselhos")
    .select(`
      id,
      turma_id,
      bimestre,
      data_conselho,
      status,
      turmas ( nome, ano, ensino )
    `)
    .order("data_conselho", { ascending: false });

  if (turmaId) query = query.eq("turma_id", turmaId);
  if (bimestre) query = query.eq("bimestre", bimestre);
  if (status) query = query.eq("status", status);

  // filtro por ensino via pós-processamento (compatível e simples)
  const { data, error } = await query;

  if (error) {
    console.log(error);
    return;
  }

  const filtrado = ensino
    ? data.filter(c => (c.turmas?.ensino || "") === ensino)
    : data;

  const tbody = document.getElementById("listaConselhos");
  tbody.innerHTML = "";

  if (!filtrado || filtrado.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum conselho encontrado.</td></tr>`;
    return;
  }

  filtrado.forEach(c => {
    const turmaNome = c.turmas ? `${c.turmas.nome} - ${c.turmas.ano}` : "Turma";
    const ensinoTxt = c.turmas?.ensino || "-";
    const dataTxt = c.data_conselho ? formatarDataBR(c.data_conselho) : "-";
    const statusTxt = c.status || "-";

    tbody.innerHTML += `
      <tr>
        <td>${turmaNome}</td>
        <td>${ensinoTxt}</td>
        <td>${c.bimestre}</td>
        <td>${dataTxt}</td>
        <td>${statusTxt}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="abrirConselho('${c.turma_id}', '${c.bimestre}')">
            Abrir
          </button>

          <button class="btn btn-sm btn-outline-secondary" onclick="baixarRelatorio('${c.id}')" ${statusTxt !== "finalizado" ? "disabled" : ""}>
            PDF
          </button>

          <button class="btn btn-sm btn-success" onclick="reabrirConselho('${c.id}')" ${statusTxt !== "finalizado" ? "disabled" : ""}>
            Reabrir
          </button>

          <button class="btn btn-sm btn-danger" onclick="excluirConselho('${c.id}')">
            Excluir
          </button>
        </td>
      </tr>
    `;
  });
}

function abrirConselho(turmaId, bimestre) {
  // A tela conselho.html já carrega por seleção.
  // Aqui só “pré-seleciona” para facilitar.
  localStorage.setItem("conselho_turma_id", turmaId);
  localStorage.setItem("conselho_bimestre", String(bimestre));
  window.location.href = "conselho.html";
}

async function reabrirConselho(conselhoId) {
  const confirmar = confirm("Deseja reabrir este conselho? Ele volta para 'em_andamento'.");
  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("conselhos")
    .update({ status: "em_andamento" })
    .eq("id", conselhoId);

  if (error) {
    alert("Erro ao reabrir.");
    console.log(error);
    return;
  }

  alert("Conselho reaberto!");
  loadConselhos();
}

async function excluirConselho(conselhoId) {
  const confirmar = confirm(
    "ATENÇÃO: excluir é permanente e remove os registros do conselho.\n\nDeseja continuar?"
  );
  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("conselhos")
    .delete()
    .eq("id", conselhoId);

  if (error) {
    alert("Erro ao excluir.");
    console.log(error);
    return;
  }

  alert("Conselho excluído com sucesso!");
  loadConselhos();
}

function formatarDataBR(isoDate) {
  // isoDate vem tipo "2026-03-01"
  const [y, m, d] = String(isoDate).split("-");
  return `${d}/${m}/${y}`;
}



// =============================
// Relatório do Conselho (PDF)
// =============================
// =============================
// Relatório do Conselho (PDF)
// =============================
async function baixarRelatorio(conselhoId) {
  if (!window.jspdf || !window.jspdf?.jsPDF) {
    alert("jsPDF não carregou. Verifique os scripts do jsPDF e autoTable no HTML.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape", "mm", "a4");

  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 8;
  const marginR = 8;
  const contentW = pageW - marginL - marginR;

  // 1) Conselho + turma + observações gerais
  const { data: conselho, error: errConselho } = await supabaseClient
    .from("conselhos")
    .select("id, bimestre, turma_id, observacoes_gerais, data_conselho, turmas(nome, ano)")
    .eq("id", conselhoId)
    .single();

  if (errConselho || !conselho) {
    console.error("Erro conselho:", errConselho);
    alert("Erro ao buscar dados do conselho.");
    return;
  }

  // 2) Registros do conselho + nome do aluno (ordenado)
  const { data: registros, error: errRegistros } = await supabaseClient
    .from("conselho_alunos")
    .select(`
      conselho_id,
      aluno_id,
      dificuldade,
      faltoso,
      faz_atividade_sala,
      dorme,
      faz_plataforma,
      indisciplina,
      nivel_proficiencia,
      concluido,
      alunos ( nome )
    `)
    .eq("conselho_id", conselhoId)
    .order("nome", { foreignTable: "alunos", ascending: true });

  if (errRegistros) {
    console.error("Erro conselho_alunos:", errRegistros);
    alert("Erro ao buscar registros do conselho (conselho_alunos).");
    return;
  }

  // Helpers de formatação (mantém seu padrão atual)
  const simNaoFaz = (obj) => {
    if (!obj || typeof obj !== "object") return "Sim";
    const faz = obj.faz !== undefined ? !!obj.faz : true;
    const materias = (obj.materias || "").trim();
    if (faz) return "Sim";
    return materias ? `Não (${materias})` : "Não";
  };

  const difTxt = (obj) => {
    if (!obj || typeof obj !== "object") return "Não";
    const tem = !!obj.tem;
    const materias = (obj.materias || "").trim();
    if (!tem) return "Não";
    return materias ? `Sim (${materias})` : "Sim";
  };

  const formatarDataBR = (isoDate) => {
    if (!isoDate) return "-";
    const s = String(isoDate);
    if (s.includes("T")) {
      const [y, m, d] = s.split("T")[0].split("-");
      return `${d}/${m}/${y}`;
    }
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return "-";
    return `${d}/${m}/${y}`;
  };

  // ============================
  // CABEÇALHO (mais “documento”)
  // ============================
  const turmaTxt = conselho.turmas
    ? `${conselho.turmas.nome} - ${conselho.turmas.ano || ""}`.trim()
    : "Turma";

  const titulo = "PEI Manoel Ignácio da Silva";
  const subtitulo = `Relatório do Conselho de Classe • ${turmaTxt} • ${conselho.bimestre}º Bimestre`;
  const dataConselhoTxt = conselho.data_conselho ? formatarDataBR(conselho.data_conselho) : "-";
  const dataEmissaoTxt = formatarDataBR(new Date().toISOString());

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(titulo, pageW / 2, 10, { align: "center" });

  doc.setFontSize(11);
  doc.text(subtitulo, pageW / 2, 16.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Data do conselho: ${dataConselhoTxt}`, marginL, 23);
  doc.text(`Emissão: ${dataEmissaoTxt}`, pageW - marginR, 23, { align: "right" });

  // Linhas para preenchimento manual (professor/coordenação)
  doc.setFontSize(10);
  doc.text("Professor representante: ____________________________________________", marginL, 29);
  doc.text("Reunião com responsáveis (data): ____/____/______", pageW - marginR, 29, { align: "right" });

  // ============================
  // OBSERVAÇÕES GERAIS (antes da tabela)
  // ============================
  
	const obsLabelY = 35;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(11);
	doc.text("Observações gerais da turma:", marginL, obsLabelY);

	// Texto
	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);

	const obs = (conselho.observacoes_gerais || "").trim() || "—";
	const obsLines = doc.splitTextToSize(obs, contentW - 6); // espaço interno da caixa

	const boxPadding = 3;
	const textStartY = obsLabelY + 6;
	const boxStartY = obsLabelY + 2;

	const lineHeight = 4.5;
	const boxHeight = (obsLines.length * lineHeight) + (boxPadding * 2);

	// Desenha a borda
	doc.setDrawColor(0);      // preto
	doc.setLineWidth(0.3);    // espessura fina
	doc.rect(
	  marginL,
	  boxStartY,
	  contentW,
	  boxHeight
	);

	// Escreve o texto dentro da caixa
	doc.text(
	  obsLines,
	  marginL + boxPadding,
	  textStartY + boxPadding
	);

	// Atualiza o ponto inicial da tabela
	let startY = boxStartY + boxHeight + 2;

  // ============================
  // TABELA (fonte maior e margens menores)
  // ============================
  const colunas = [
    "Nome",
    "Dificuldade",
    "Faltoso",
    "Atividade em sala",
    "Dorme",
    "Plataformas",
    "Indisciplina",
    "Proficiência",
    "Assinatura do responsável"
  ];

  const linhas = (registros || []).map(r => ([
    r.alunos?.nome || "",
    difTxt(r.dificuldade),
    r.faltoso ? "Sim" : "Não",
    simNaoFaz(r.faz_atividade_sala),
    r.dorme ? "Sim" : "Não",
    simNaoFaz(r.faz_plataforma),
    r.indisciplina ? "Sim" : "Não",
    r.nivel_proficiencia || "-",
    "" // assinatura manual
  ]));

  doc.autoTable({
    head: [colunas],
    body: linhas,
    startY,
    theme: "grid",
    margin: { top: 8, left: marginL, right: marginR },
    styles: {
      fontSize: 9,       // ↑ maior que o seu 7 atual
      cellPadding: 2,
      valign: "middle"
    },
    headStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 45 }, // Nome
      1: { cellWidth: 35 }, // Dificuldade
      2: { cellWidth: 18 }, // Faltoso
      3: { cellWidth: 35 }, // Sala
      4: { cellWidth: 14 }, // Dorme
      5: { cellWidth: 35 }, // Plataformas
      6: { cellWidth: 22 }, // Indisciplina
      7: { cellWidth: 22 }, // Proficiência
      8: { cellWidth: 55 }  // Assinatura (bem maior)
    }
  });

  // ============================
  // RODAPÉ (arquivo/arquivamento)
  // ============================
  const finalY = doc.lastAutoTable?.finalY || 190;
  const footerY = Math.min(finalY + 8, 200);

  doc.setFontSize(9);
  doc.text("Após a reunião, devolver este documento assinado à Coordenação para arquivamento.", marginL, footerY);

  doc.save(`Relatorio_Conselho_${turmaTxt}_${conselho.bimestre}Bim.pdf`);
}
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

//Inicia o conselho pelo perfil da coordenação, caso o professor não consiga abrir
async function iniciarConselho() {
  const turmaId = document.getElementById("filtroTurma").value;
  const bimestre = document.getElementById("filtroBimestre").value;

  if (!turmaId) {
    alert("Selecione uma turma para iniciar o conselho.");
    return;
  }
  if (!bimestre) {
    alert("Selecione um bimestre para iniciar o conselho.");
    return;
  }

  // Verifica se já existe conselho
  const { data: existente, error: errBusca } = await supabaseClient
    .from("conselhos")
    .select("id")
    .eq("turma_id", turmaId)
    .eq("bimestre", bimestre)
    .maybeSingle();

  if (errBusca) {
    console.log(errBusca);
    alert("Erro ao verificar conselho.");
    return;
  }

  // Se não existir, cria
  if (!existente) {
    const { error: errCria } = await supabaseClient
      .from("conselhos")
      .insert({ turma_id: turmaId, bimestre: parseInt(bimestre, 10) });

    if (errCria) {
      console.log(errCria);
      alert("Erro ao iniciar conselho (criar).");
      return;
    }
  }

  // Abre a página do conselho já pré-selecionada
  localStorage.setItem("conselho_turma_id", turmaId);
  localStorage.setItem("conselho_bimestre", String(bimestre));
  window.location.href = "conselho.html";
}

function renderTurmasFiltro() {
  const ensino = document.getElementById("filtroEnsino").value;

  const select = document.getElementById("filtroTurma");
  const turmaSelecionadaAntes = select.value; // tenta manter a seleção

  select.innerHTML = `<option value="">Todas</option>`;

  const turmasFiltradas = ensino
    ? turmasCache.filter(t => (t.ensino || "") === ensino)
    : turmasCache;

  turmasFiltradas.forEach(t => {
    const ensinoTxt = t.ensino ? ` (${t.ensino})` : "";
    select.innerHTML += `<option value="${t.id}">${t.nome} - ${t.ano}${ensinoTxt}</option>`;
  });

  // tenta restaurar seleção anterior se ainda existir
  const aindaExiste = [...select.options].some(o => o.value === turmaSelecionadaAntes);
  if (aindaExiste) select.value = turmaSelecionadaAntes;
}

function onEnsinoChange() {
  // ao trocar ensino, reseta turma para evitar inconsistência
  document.getElementById("filtroTurma").value = "";
  renderTurmasFiltro();
  loadConselhos();
}