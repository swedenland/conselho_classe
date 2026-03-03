let professorLogado = null;

async function checkProfessor() {

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "professor") {
    alert("Acesso restrito a professores.");
    window.location.href = "dashboard.html";
    return;
  }

  professorLogado = profile;
  document.getElementById("boasVindas").innerText =
    `Olá, ${profile.nome} 👋`;
	
	// Verifica se é representante
	const { data: representacao } = await supabaseClient
	  .from("professor_turma")
	  .select("id")
	  .eq("professor_id", professorLogado.id);

	if (!representacao || representacao.length === 0) {
	  document.getElementById("btnConselho").style.display = "none";
	}
}

async function loadMinhasDisciplinas() {

  const { data, error } = await supabaseClient
    .from("professor_disciplina_turma")
    .select(`
      id,
      turma_id,
      disciplina_id,
      turmas ( nome, ano ),
      disciplinas ( nome )
    `)
    .eq("professor_id", professorLogado.id);

  if (error) {
    console.log(error);
    return;
  }

  const container = document.getElementById("listaDisciplinas");
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = "<p>Você ainda não possui disciplinas vinculadas.</p>";
    return;
  }

  data.forEach(item => {

    container.innerHTML += `
      <div class="d-flex justify-content-between align-items-center border p-3 mb-2 rounded">
        <div>
          <strong>${item.turmas?.nome || "Turma"} - ${item.turmas?.ano || ""}</strong><br>
			${item.disciplinas?.nome || "Disciplina"}
        </div>
        <button class="btn btn-primary"
          onclick="irParaLancamento(
            '${item.turma_id}',
            '${item.disciplina_id}',
            '${item.turmas.nome}',
            '${item.disciplinas.nome}'
          )">
          Lançar Notas
        </button>
      </div>
    `;
  });
}

function irParaLancamento(turmaId, disciplinaId, turmaNome, disciplinaNome) {

  localStorage.setItem("turma_id", turmaId);
  localStorage.setItem("disciplina_id", disciplinaId);
  localStorage.setItem("turma_nome", turmaNome);
  localStorage.setItem("disciplina_nome", disciplinaNome);

  window.location.href = "lancamento-notas.html";
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

function abrirLancamento() {
  document.getElementById("menuPrincipal").style.display = "none";
  document.getElementById("areaDisciplinas").style.display = "block";
}

function voltarMenu() {
  document.getElementById("menuPrincipal").style.display = "block";
  document.getElementById("areaDisciplinas").style.display = "none";
}

function irParaConselho() {
  window.location.href = "conselho.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  await checkProfessor();
  await loadMinhasDisciplinas();
});