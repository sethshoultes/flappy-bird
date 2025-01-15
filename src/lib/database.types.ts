export interface Database {
  public: {
    Tables: {
      high_scores: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          created_at: string;
          username: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score: number;
          created_at?: string;
          username: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          score?: number;
          created_at?: string;
          username?: string;
        };
      };
    };
  };
}