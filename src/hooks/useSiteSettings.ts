import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSettings() {
  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar configurações do site:', error);
          aplicarDoLocalStorage();
          return;
        }

        if (data) {
          // Aplica do banco de dados e atualiza localStorage
          if (data.site_title) {
            document.title = data.site_title;
            localStorage.setItem("siteTitle", data.site_title);
          }
          
          if (data.site_description) {
            const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
            const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
            if (metaDesc) metaDesc.content = data.site_description;
            if (ogDesc) ogDesc.content = data.site_description;
            localStorage.setItem("siteDescription", data.site_description);
          }
          
          if (data.favicon_url) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement("link");
              link.rel = "icon";
              document.head.appendChild(link);
            }
            link.href = data.favicon_url;
            localStorage.setItem("siteFavicon", data.favicon_url);
          }
        } else {
          // Sem configurações no banco, usa localStorage
          aplicarDoLocalStorage();
        }
      } catch (error) {
        console.error('Erro ao carregar configurações do site:', error);
        aplicarDoLocalStorage();
      }
    };

    const aplicarDoLocalStorage = () => {
      const tituloSalvo = localStorage.getItem("siteTitle");
      const faviconSalvo = localStorage.getItem("siteFavicon");
      
      if (tituloSalvo) {
        document.title = tituloSalvo;
      }
      
      if (faviconSalvo) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = faviconSalvo;
      }
    };

    carregarConfiguracoes();
  }, []);
}
