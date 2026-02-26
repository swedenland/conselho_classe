async function checkUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.log(error);
    return;
  }

  document.getElementById("welcome").innerText =
    "Bem-vindo, " + profile.nome;

  renderByRole(profile.role);
}

function renderByRole(role) {
  const container = document.getElementById("content");

  if (role === "admin") {
    container.innerHTML = `
      <h3>Painel Admin</h3>
      <button>Gerenciar Usuários</button>
      <button>Gerenciar Turmas</button>
    `;
  }

  if (role === "coordenacao") {
    container.innerHTML = `
      <h3>Painel Coordenação</h3>
      <button>Gerenciar Conselhos</button>
    `;
  }

  if (role === "professor") {
    container.innerHTML = `
      <h3>Minha Turma</h3>
      <button>Registrar Conselho</button>
    `;
  }
}

checkUser();