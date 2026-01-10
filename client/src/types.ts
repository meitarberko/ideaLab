export type IdeaFeedItem = {
  id: string;
  authorId: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
};
