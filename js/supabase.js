const { createClient } = supabase;

const supabaseUrl = "https://habbmqxrsalhwiiluzrk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhYmJtcXhyc2FsaHdpaWx1enJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjI4MTYsImV4cCI6MjA4NzYzODgxNn0.YJQXudX7tRjdqkFeSYjjMtDP5Xsu2aN6ntx2UMTA0aU";

window.supabaseClient = createClient(supabaseUrl, supabaseKey);

console.log("Supabase conectado");