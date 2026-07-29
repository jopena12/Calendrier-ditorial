export type Platform = "linkedin" | "instagram" | "facebook" | "tiktok";

export type PostStatus = "draft" | "valide" | "publie";

export type Brand = {
  id: string;
  name: string;
  website_url: string | null;
  brand_profile: string | null;
  editorial_guidelines: string | null;
  onboarding_answers: OnboardingAnswers | null;
  color_hex: string | null;
  created_at: string;
  updated_at: string;
};

export type OnboardingAnswers = {
  activity?: string;
  targets?: string;
  tone?: string;
  forbidden?: string;
  examples?: string;
};

export type BrandPlatform = {
  id: string;
  brand_id: string;
  platform: Platform;
  active: boolean;
};

export type Topic = {
  id: string;
  brand_id: string;
  title: string;
  angle: string | null;
  details: string | null;
  objective: string | null;
  selected_platforms: Platform[];
  created_at: string;
};

export type Post = {
  id: string;
  topic_id: string;
  brand_id: string;
  platform: Platform;
  content: string;
  hashtags: string[] | null;
  media_suggestion: string | null;
  status: PostStatus;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
};

export type PostWithRelations = Post & {
  brands: Pick<Brand, "id" | "name" | "color_hex"> | null;
  topics: Pick<Topic, "id" | "title" | "angle" | "details" | "objective"> | null;
};
