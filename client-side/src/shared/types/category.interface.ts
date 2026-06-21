export interface ICategory {
    id: string;
    createdAt: string; 
    title: string;
    description: string;
    imageUrl: string;
    slug: string; 
}

export type ICategoryInput = Pick<ICategory, 'title' | 'description' | 'imageUrl' | 'slug'>;