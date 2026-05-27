export interface BucketItem {
  id: string;
  title: string;
  location: string;
  type: string;
  state: 'Idea' | 'Todo' | 'Done';
  date: string;
  note: string;
  url: string;
  imageUrl: string;
  tags: string[];
  iconType: 'key' | 'food' | 'mountain';
}
