// Live configuration — the anon key is Supabase's publishable client key (safe in public code).
// Same Supabase project as the Montreal and Japan apps; rows are scoped by TRIP_ID.
window.TRIP_CONFIG = {
  SUPABASE_URL: "https://asxdpjlqndxpcwtsuyle.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeGRwamxxbmR4cGN3dHN1eWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNjI3MjYsImV4cCI6MjA5OTgzODcyNn0.o1aqBvxd-fkLK20xru6nVz_jtwW0tDLSRXO7ValDMZs",

  // The concierge proxy on Railway (root directory = concierge, target port 3000).
  // Health check: open this URL with /health on the end — it should answer {"ok":true,...}.
  CONCIERGE_URL: "https://cousinnyctrip-production.up.railway.app",

  TRIP_KEY: "nyc-2026",          // must match the TRIP_KEY env var on Railway
  TRIP_ID: "nyc-2026-tatyana"    // scopes rows in the shared Supabase table — never reuse an old trip's id
                                   // (it keeps her full name on purpose: renaming it would strand the synced votes and plan)
};
