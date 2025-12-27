import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSettings() {
  useEffect(() => {
    const loadAndApplySettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading site settings:', error);
          // Fallback to localStorage if DB fails
          applyFromLocalStorage();
          return;
        }

        if (data) {
          // Apply from database and update localStorage
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
          // No database settings, use localStorage
          applyFromLocalStorage();
        }
      } catch (error) {
        console.error('Error loading site settings:', error);
        applyFromLocalStorage();
      }
    };

    const applyFromLocalStorage = () => {
      const savedTitle = localStorage.getItem("siteTitle");
      const savedFavicon = localStorage.getItem("siteFavicon");
      
      if (savedTitle) {
        document.title = savedTitle;
      }
      
      if (savedFavicon) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = savedFavicon;
      }
    };

    loadAndApplySettings();
  }, []);
}
