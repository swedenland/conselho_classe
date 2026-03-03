document.addEventListener("DOMContentLoaded", async () => {

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("role, nome")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    alert("Perfil não encontrado.");
    window.location.href = "index.html";
    return;
  }

  // Redirecionamento automático por perfil
  if (profile.role === "admin") {
    window.location.href = "admin.html";
  }
  else if (profile.role === "professor") {
    window.location.href = "dashboard-professor.html";
  }
  else if (profile.role === "coordenacao") {
    window.location.href = "dashboard-coordenacao.html";
  }
  else {
    alert("Perfil inválido.");
    window.location.href = "index.html";
  }

});

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}