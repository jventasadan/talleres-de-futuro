import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import App from "./App.tsx";
import "./index.css";

const runtimeUrl = import.meta.env.VITE_SUPABASE_URL;
const runtimeKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (runtimeUrl && runtimeKey) {
  const runtimeClient = createClient<Database>(runtimeUrl, runtimeKey, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  Object.assign(supabase, runtimeClient);
}

createRoot(document.getElementById("root")!).render(<App />);
