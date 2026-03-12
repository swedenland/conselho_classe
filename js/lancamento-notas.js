let turmaId = null;
let disciplinaId = null;

function voltarDashboard() {
  window.location.href = "dashboard-professor.html";
}

function carregarInfo() {

  turmaId = localStorage.getItem("turma_id");
  disciplinaId = localStorage.getItem("disciplina_id");
  const turmaNome = localStorage.getItem("turma_nome");
  const disciplinaNome = localStorage.getItem("disciplina_nome");

  if (!turmaId || !disciplinaId) {
    alert("Erro ao carregar dados.");
    voltarDashboard();
    return;
  }

  document.getElementById("infoTurmaDisciplina").innerText =
    `${turmaNome} - ${disciplinaNome}`;
}

async function carregarAlunos() {

  const bimestre = document.getElementById("bimestreSelect").value;

  const { data: alunos, error } = await supabaseClient
    .from("alunos")
    .select("id, nome, numero_chamada")
    .eq("turma_id", turmaId)
    .order("numero_chamada", { ascending: true, nullsFirst: false })
    .order("nome", { ascending: true });

  if (error) {
    console.log(error);
    return;
  }

  const { data: notas } = await supabaseClient
    .from("notas_frequencia")
    .select("*")
    .eq("disciplina_id", disciplinaId)
    .eq("bimestre", bimestre);

  const tabela = document.getElementById("tabelaAlunos");
  tabela.innerHTML = "";

  tabela.innerHTML += `
    <table class="table table-bordered table-chamada">
      <thead>
        <tr>
          <th class="col-chamada">Nº</th>
          <th>Aluno</th>
          <th>Média</th>
          <th>Faltas</th>
        </tr>
      </thead>
      <tbody id="corpoTabela"></tbody>
    </table>
  `;

  const corpo = document.getElementById("corpoTabela");

  alunos.forEach(aluno => {

    const notaExistente = notas?.find(n => n.aluno_id === aluno.id);

    corpo.innerHTML += `
      <tr>
        <td class="col-chamada">${aluno.numero_chamada ?? ""}</td>
        <td class="col-aluno">${aluno.nome}</td>
        <td>
          <input type="number" min="0" max="10" step="1"
            class="form-control media"
            data-aluno="${aluno.id}"
            value="${notaExistente?.media ?? ''}">
        </td>
        <td>
          <input type="number" min="0"
            class="form-control faltas"
            data-aluno="${aluno.id}"
            value="${notaExistente?.faltas ?? ''}">
        </td>
      </tr>
    `;
  });
}

async function salvarNotas() {

  const bimestre = document.getElementById("bimestreSelect").value;

  const inputsMedia = document.querySelectorAll(".media");
  const inputsFaltas = document.querySelectorAll(".faltas");

  for (let i = 0; i < inputsMedia.length; i++) {

    const aluno_id = inputsMedia[i].dataset.aluno;
    const media = inputsMedia[i].value || null;
    const faltas = inputsFaltas[i].value || null;

    const { error } = await supabaseClient
      .from("notas_frequencia")
      .upsert([{
        aluno_id,
        disciplina_id: disciplinaId,
        bimestre,
        media,
        faltas
      }], {
        onConflict: ["aluno_id", "disciplina_id", "bimestre"]
      });

    if (error) {
      console.log(error);
      alert("Erro ao salvar notas.");
      return;
    }
  }

  alert("Notas salvas com sucesso!");
}

document.addEventListener("DOMContentLoaded", async () => {
  carregarInfo();
  await carregarAlunos();
});
