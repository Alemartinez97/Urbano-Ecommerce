import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('inventory')
export class InventoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column({ default: 0 })
  quantity: number;

  @UpdateDateColumn()
  updatedAt: Date;
}