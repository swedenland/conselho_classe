async function checkAdmin() {
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

  if (!profile || profile.role !== "admin") {
    alert("Acesso restrito ao administrador.");
    window.location.href = "dashboard.html";
    return;
  }
}

async function createProfile() {
  const nome = document.getElementById("nome").value;
  const user_id = document.getElementById("user_id").value;
  const role = document.getElementById("role").value;

  const { error } = await supabaseClient
    .from("profiles")
    .insert([
      {
        id: user_id,
        nome: nome,
        role: role
      }
    ]);

  if (error) {
    alert("Erro ao salvar perfil.");
    console.log(error);
  } else {
    alert("Perfil criado com sucesso!");
    loadUsers();
  }
}

async function loadUsers() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*");

  if (error) {
    console.log(error);
    return;
  }

  const container = document.getElementById("userList");
  container.innerHTML = "";

  data.forEach(user => {
    container.innerHTML += `
      <p><strong>${user.nome}</strong> - ${user.role}</p>
    `;
  });
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  await checkAdmin();
  await loadUsers();
});