// js/nav.js
document.addEventListener("DOMContentLoaded", async () => {
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) btnLogout.addEventListener("click", () => logout());

  const hasNavbar = document.getElementById("appNavbar");
  if (!hasNavbar) return;

  const { data: { user }, error: authErr } = await supabaseClient.auth.getUser();
  if (authErr) console.error(authErr);

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("id, nome, role")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const label = document.getElementById("navUserLabel");
  if (label) {
    const nome = profile?.nome || user.email || "Usuário";
    const role = profile?.role || "";
    label.textContent = role ? `${nome} • ${role}` : nome;
  }

  const role = (profile?.role || "").toLowerCase();
  document.querySelectorAll("[data-role]").forEach(el => {
    const allowed = (el.getAttribute("data-role") || "")
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    el.style.display = allowed.includes(role) ? "" : "none";
  });
});
