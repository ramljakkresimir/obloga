export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      artikli: {
        Row: {
          aktivan: boolean
          cijena_kom: number
          created_at: string
          duzina_cm: number | null
          id: number
          kategorija_id: number
          m2_po_komadu: number | null
          min_stanje: number
          naziv: string
          sirina_cm: number | null
          slika: string | null
          stanje: number
          updated_at: string
        }
        Insert: {
          aktivan?: boolean
          cijena_kom: number
          created_at?: string
          duzina_cm?: number | null
          id?: never
          kategorija_id: number
          m2_po_komadu?: number | null
          min_stanje?: number
          naziv: string
          sirina_cm?: number | null
          slika?: string | null
          stanje?: number
          updated_at?: string
        }
        Update: {
          aktivan?: boolean
          cijena_kom?: number
          created_at?: string
          duzina_cm?: number | null
          id?: never
          kategorija_id?: number
          m2_po_komadu?: number | null
          min_stanje?: number
          naziv?: string
          sirina_cm?: number | null
          slika?: string | null
          stanje?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artikli_kategorija_id_fkey"
            columns: ["kategorija_id"]
            isOneToOne: false
            referencedRelation: "kategorije"
            referencedColumns: ["id"]
          },
        ]
      }
      biljeske: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          obavljeno: boolean
          obavljeno_at: string | null
          tekst: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          obavljeno?: boolean
          obavljeno_at?: string | null
          tekst: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          obavljeno?: boolean
          obavljeno_at?: string | null
          tekst?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biljeske_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vlasnici"
            referencedColumns: ["user_id"]
          },
        ]
      }
      brojaci: {
        Row: {
          godina: number
          zadnji: number
        }
        Insert: {
          godina: number
          zadnji?: number
        }
        Update: {
          godina?: number
          zadnji?: number
        }
        Relationships: []
      }
      kategorije: {
        Row: {
          created_at: string
          id: number
          naziv: string
          redoslijed: number
        }
        Insert: {
          created_at?: string
          id?: never
          naziv: string
          redoslijed?: number
        }
        Update: {
          created_at?: string
          id?: never
          naziv?: string
          redoslijed?: number
        }
        Relationships: []
      }
      kretanja_stanja: {
        Row: {
          artikl_id: number
          created_at: string
          id: number
          korisnik_id: string | null
          napomena: string | null
          ponistava_id: number | null
          predracun_id: number | null
          promjena: number
          tip: Database["public"]["Enums"]["tip_kretanja"]
        }
        Insert: {
          artikl_id: number
          created_at?: string
          id?: never
          korisnik_id?: string | null
          napomena?: string | null
          ponistava_id?: number | null
          predracun_id?: number | null
          promjena: number
          tip: Database["public"]["Enums"]["tip_kretanja"]
        }
        Update: {
          artikl_id?: number
          created_at?: string
          id?: never
          korisnik_id?: string | null
          napomena?: string | null
          ponistava_id?: number | null
          predracun_id?: number | null
          promjena?: number
          tip?: Database["public"]["Enums"]["tip_kretanja"]
        }
        Relationships: [
          {
            foreignKeyName: "kretanja_stanja_artikl_id_fkey"
            columns: ["artikl_id"]
            isOneToOne: false
            referencedRelation: "artikli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kretanja_stanja_korisnik_id_fkey"
            columns: ["korisnik_id"]
            isOneToOne: false
            referencedRelation: "vlasnici"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "kretanja_stanja_ponistava_id_fkey"
            columns: ["ponistava_id"]
            isOneToOne: true
            referencedRelation: "kretanja_stanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kretanja_stanja_predracun_id_fkey"
            columns: ["predracun_id"]
            isOneToOne: false
            referencedRelation: "predracuni"
            referencedColumns: ["id"]
          },
        ]
      }
      postavke: {
        Row: {
          adresa: string | null
          banka: string | null
          cijene_sa_pdv: boolean
          email: string | null
          id: number
          instagram: string | null
          jib: string | null
          ljepilo_cijena: number
          mjesto: string | null
          naziv_firme: string
          pdv_broj: string | null
          pdv_stopa: number
          telefon: string | null
          transakcijski_racun: string | null
          u_sustavu_pdv: boolean
          updated_at: string
          viber: string | null
          vlasnik: string | null
          web: string | null
          whatsapp: string | null
        }
        Insert: {
          adresa?: string | null
          banka?: string | null
          cijene_sa_pdv?: boolean
          email?: string | null
          id?: number
          instagram?: string | null
          jib?: string | null
          ljepilo_cijena?: number
          mjesto?: string | null
          naziv_firme: string
          pdv_broj?: string | null
          pdv_stopa?: number
          telefon?: string | null
          transakcijski_racun?: string | null
          u_sustavu_pdv?: boolean
          updated_at?: string
          viber?: string | null
          vlasnik?: string | null
          web?: string | null
          whatsapp?: string | null
        }
        Update: {
          adresa?: string | null
          banka?: string | null
          cijene_sa_pdv?: boolean
          email?: string | null
          id?: number
          instagram?: string | null
          jib?: string | null
          ljepilo_cijena?: number
          mjesto?: string | null
          naziv_firme?: string
          pdv_broj?: string | null
          pdv_stopa?: number
          telefon?: string | null
          transakcijski_racun?: string | null
          u_sustavu_pdv?: boolean
          updated_at?: string
          viber?: string | null
          vlasnik?: string | null
          web?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      predracun_stavke: {
        Row: {
          artikl_id: number
          cijena_kom: number
          id: number
          iznos: number
          komada: number
          m2_po_komadu: number | null
          naziv: string
          popust_iznos: number
          popust_tip: Database["public"]["Enums"]["tip_popusta"] | null
          popust_vrijednost: number | null
          predracun_id: number
          redoslijed: number
          unesena_m2: number | null
          unos: Database["public"]["Enums"]["jedinica_unosa"]
        }
        Insert: {
          artikl_id: number
          cijena_kom: number
          id?: never
          iznos: number
          komada: number
          m2_po_komadu?: number | null
          naziv: string
          popust_iznos?: number
          popust_tip?: Database["public"]["Enums"]["tip_popusta"] | null
          popust_vrijednost?: number | null
          predracun_id: number
          redoslijed: number
          unesena_m2?: number | null
          unos: Database["public"]["Enums"]["jedinica_unosa"]
        }
        Update: {
          artikl_id?: number
          cijena_kom?: number
          id?: never
          iznos?: number
          komada?: number
          m2_po_komadu?: number | null
          naziv?: string
          popust_iznos?: number
          popust_tip?: Database["public"]["Enums"]["tip_popusta"] | null
          popust_vrijednost?: number | null
          predracun_id?: number
          redoslijed?: number
          unesena_m2?: number | null
          unos?: Database["public"]["Enums"]["jedinica_unosa"]
        }
        Relationships: [
          {
            foreignKeyName: "predracun_stavke_artikl_id_fkey"
            columns: ["artikl_id"]
            isOneToOne: false
            referencedRelation: "artikli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predracun_stavke_predracun_id_fkey"
            columns: ["predracun_id"]
            isOneToOne: false
            referencedRelation: "predracuni"
            referencedColumns: ["id"]
          },
        ]
      }
      predracuni: {
        Row: {
          broj: string | null
          created_at: string
          created_by: string | null
          datum_isporuke: string | null
          godina: number | null
          id: number
          kopija_od: number | null
          kupac_adresa: string | null
          kupac_ime: string | null
          kupac_jib: string | null
          kupac_mjesto: string | null
          kupac_telefon: string | null
          ljepilo_cijena: number | null
          ljepilo_kom: number | null
          medjuzbroj: number
          nacin_placanja: string | null
          napomena: string | null
          osnovica: number
          pdv_cijene_sa_pdv: boolean
          pdv_iznos: number
          pdv_stopa: number
          pdv_u_sustavu: boolean
          popust_iznos: number
          popust_tip: Database["public"]["Enums"]["tip_popusta"] | null
          popust_vrijednost: number | null
          potvrden_at: string | null
          prijevoz: number | null
          redni_broj: number | null
          status: Database["public"]["Enums"]["status_predracuna"]
          storniran_at: string | null
          svrha: string | null
          ugradnja_cijena_m2: number | null
          ugradnja_m2: number | null
          ukupno: number
          updated_at: string
          vrijedi_dana: number | null
          vrsta: Database["public"]["Enums"]["vrsta_prodaje"]
        }
        Insert: {
          broj?: string | null
          created_at?: string
          created_by?: string | null
          datum_isporuke?: string | null
          godina?: number | null
          id?: never
          kopija_od?: number | null
          kupac_adresa?: string | null
          kupac_ime?: string | null
          kupac_jib?: string | null
          kupac_mjesto?: string | null
          kupac_telefon?: string | null
          ljepilo_cijena?: number | null
          ljepilo_kom?: number | null
          medjuzbroj: number
          nacin_placanja?: string | null
          napomena?: string | null
          osnovica: number
          pdv_cijene_sa_pdv: boolean
          pdv_iznos?: number
          pdv_stopa: number
          pdv_u_sustavu: boolean
          popust_iznos?: number
          popust_tip?: Database["public"]["Enums"]["tip_popusta"] | null
          popust_vrijednost?: number | null
          potvrden_at?: string | null
          prijevoz?: number | null
          redni_broj?: number | null
          status?: Database["public"]["Enums"]["status_predracuna"]
          storniran_at?: string | null
          svrha?: string | null
          ugradnja_cijena_m2?: number | null
          ugradnja_m2?: number | null
          ukupno: number
          updated_at?: string
          vrijedi_dana?: number | null
          vrsta?: Database["public"]["Enums"]["vrsta_prodaje"]
        }
        Update: {
          broj?: string | null
          created_at?: string
          created_by?: string | null
          datum_isporuke?: string | null
          godina?: number | null
          id?: never
          kopija_od?: number | null
          kupac_adresa?: string | null
          kupac_ime?: string | null
          kupac_jib?: string | null
          kupac_mjesto?: string | null
          kupac_telefon?: string | null
          ljepilo_cijena?: number | null
          ljepilo_kom?: number | null
          medjuzbroj?: number
          nacin_placanja?: string | null
          napomena?: string | null
          osnovica?: number
          pdv_cijene_sa_pdv?: boolean
          pdv_iznos?: number
          pdv_stopa?: number
          pdv_u_sustavu?: boolean
          popust_iznos?: number
          popust_tip?: Database["public"]["Enums"]["tip_popusta"] | null
          popust_vrijednost?: number | null
          potvrden_at?: string | null
          prijevoz?: number | null
          redni_broj?: number | null
          status?: Database["public"]["Enums"]["status_predracuna"]
          storniran_at?: string | null
          svrha?: string | null
          ugradnja_cijena_m2?: number | null
          ugradnja_m2?: number | null
          ukupno?: number
          updated_at?: string
          vrijedi_dana?: number | null
          vrsta?: Database["public"]["Enums"]["vrsta_prodaje"]
        }
        Relationships: [
          {
            foreignKeyName: "predracuni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vlasnici"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "predracuni_kopija_od_fkey"
            columns: ["kopija_od"]
            isOneToOne: false
            referencedRelation: "predracuni"
            referencedColumns: ["id"]
          },
        ]
      }
      vlasnici: {
        Row: {
          created_at: string
          ime: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ime: string
          user_id: string
        }
        Update: {
          created_at?: string
          ime?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      brza_prodaja: { Args: { p_podaci: Json }; Returns: number }
      obrisi_oblogu: { Args: { p_id: number }; Returns: string }
      odbij_predracun: { Args: { p_id: number }; Returns: undefined }
      ping: { Args: never; Returns: string }
      ponisti_ulaz: { Args: { p_kretanje_id: number }; Returns: undefined }
      potvrdi_predracun: { Args: { p_id: number }; Returns: undefined }
      spremi_predracun: {
        Args: { p_id: number; p_podaci: Json }
        Returns: number
      }
      storniraj_predracun: { Args: { p_id: number }; Returns: undefined }
      ulaz_robe: {
        Args: { p_napomena?: string; p_stavke: Json }
        Returns: number
      }
    }
    Enums: {
      jedinica_unosa: "m2" | "kom"
      status_predracuna: "otvoren" | "potvrden" | "odbijen" | "storniran"
      tip_kretanja:
        | "ulaz"
        | "predracun"
        | "brza_prodaja"
        | "storno"
        | "ponistenje"
      tip_popusta: "posto" | "km"
      vrsta_prodaje: "predracun" | "brza_prodaja"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      jedinica_unosa: ["m2", "kom"],
      status_predracuna: ["otvoren", "potvrden", "odbijen", "storniran"],
      tip_kretanja: [
        "ulaz",
        "predracun",
        "brza_prodaja",
        "storno",
        "ponistenje",
      ],
      tip_popusta: ["posto", "km"],
      vrsta_prodaje: ["predracun", "brza_prodaja"],
    },
  },
} as const
