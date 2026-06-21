import { ICategory } from "./category.interface";

export interface IProduct {
    id: string;
    createdAt: string; // Исправлено на стандарт
    title: string;
    description: string;
    price: number;
    imageUrl: string;
    slug: string; // Нужно для URL магазина
    category: ICategory;
}

export interface IProductInput 
    extends Pick<IProduct, 'title' | 'description' | 'price' | 'imageUrl' | 'slug'> {
        categoryId: string; // При создании передаем ID категории
    }