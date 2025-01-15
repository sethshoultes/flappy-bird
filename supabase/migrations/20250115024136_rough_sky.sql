/*
  # Create high scores table

  1. New Tables
    - `high_scores`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `score` (integer)
      - `created_at` (timestamp)
      - `username` (text)

  2. Security
    - Enable RLS on `high_scores` table
    - Add policies for:
      - Anyone can read high scores
      - Authenticated users can insert their own scores
*/

CREATE TABLE IF NOT EXISTS high_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  score integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  username text NOT NULL
);

ALTER TABLE high_scores ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read high scores
CREATE POLICY "High scores are viewable by everyone"
  ON high_scores
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert their own scores
CREATE POLICY "Users can insert their own scores"
  ON high_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);