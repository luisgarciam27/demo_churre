
import { MenuItem } from './types';

// Use string literals for categories as MenuItem.category is of type string
// and Category in types.ts is an interface for database records, not an enum.
export const MENU_ITEMS: MenuItem[] = [
  // SANGUCHES
  {
    id: 's1',
    name: 'Pavo al Horno',
    description: 'Jugoso pavito al horno, acompañado de salsa criolla y mayonesa de la casa en pan francés.',
    price: 15,
    category: 'SANGUCHES',
    image: 'https://picsum.photos/seed/pavo/400/300',
    isPopular: true,
    tags: ['desayuno', 'bajada', 'clásico']
  },
  {
    id: 's2',
    name: 'Mal Mandao',
    description: 'Seco de res al estilo norteño, con sarsa criollita, acompañado de mayonesa de la casa en pan francés.',
    price: 15,
    category: 'SANGUCHES',
    image: 'https://picsum.photos/seed/seco/400/300',
    tags: ['almuerzo', 'contundente', 'bajada']
  },
  {
    id: 's3',
    name: 'Salchicha Huachana',
    description: 'Salchicha huachana al horno, con chimichurri y mayonesa casera en pan francés. ¡Uno de los más pedidos!',
    price: 12,
    category: 'SANGUCHES',
    image: 'https://picsum.photos/seed/huachana/400/300',
    isPopular: true,
    tags: ['desayuno', 'favorito']
  },
  {
    id: 's4',
    name: 'Lechón al Horno',
    description: 'Lechoncito al horno, acompañado de salsa criolla y mayonesa de la casa en pan francés.',
    price: 15,
    category: 'SANGUCHES',
    image: 'https://picsum.photos/seed/lechon/400/300',
    tags: ['bajada', 'almuerzo', 'clásico']
  },
  {
    id: 's5',
    name: 'Choripán Artesanal',
    description: 'Choripán artesanal con salsa chimichurri y mayonesa de la casa en pan francés.',
    price: 9,
    category: 'SANGUCHES',
    image: 'https://picsum.photos/seed/choripan/400/300',
    tags: ['rápido', 'bajada']
  },
  {
    id: 's6',
    name: 'Pan con Chicharrón',
    description: 'Delicioso chicharrón acompañado de camote amarillo y sarsa criolla en pan francés.',
    price: 15,
    category: 'SANGUCHES',
    image: 'https://picsum.photos/seed/chicharron/400/300',
    isPopular: true,
    tags: ['desayuno', 'bajada', 'norteño']
  },

  // PLATOS
  {
    id: 'p1',
    name: 'Tallarines con Pavo',
    description: 'Tallarines con pavo al horno acompañado de chifles y sarsa criolla.',
    price: 45,
    category: 'PLATOS',
    image: 'https://picsum.photos/seed/tallarines/400/300',
    tags: ['almuerzo', 'contundente']
  },
  {
    id: 'p2',
    name: 'Frito Piurano',
    description: 'Delicioso adobo de chanchito, acompañado de arroz amarillo, camote, plátano, tamal y encebollado.',
    price: 30,
    category: 'PLATOS',
    image: 'https://picsum.photos/seed/frito/400/300',
    note: 'Solo los Domingos',
    tags: ['domingo', 'desayuno', 'norteño', 'piurano']
  },
  {
    id: 'p3',
    name: 'Carne Seca con Chifles',
    description: 'Lo mejor de Piura, su carne seca con chifles, acompañada de sarsa criollita.',
    price: 20,
    category: 'PLATOS',
    image: 'https://picsum.photos/seed/carneseca/400/300',
    tags: ['almuerzo', 'piurano', 'piqueo']
  },
  {
    id: 'p4',
    name: 'Pavo con Chifles',
    description: 'Jugoso pavo al horno con chifles, acompañado de sarsa criolla.',
    price: 22,
    category: 'PLATOS',
    image: 'https://picsum.photos/seed/pavochifles/400/300',
    tags: ['almuerzo', 'piurano']
  },
  {
    id: 'p5',
    name: 'Tamalitos de Chancho',
    description: 'Tamal tradicional de la casa con el toque piurano.',
    price: 6,
    category: 'PLATOS',
    image: 'https://picsum.photos/seed/tamal/400/300',
    tags: ['desayuno', 'entrada']
  },

  // BEBIDAS
  {
    id: 'b1',
    name: 'Chicha Morada',
    description: 'Refrescante chicha morada hecha en casa.',
    price: 5,
    category: 'BEBIDAS',
    image: 'https://picsum.photos/seed/chicha/400/300',
    tags: ['refrescante', 'clásico']
  },
  {
    id: 'b2',
    name: 'Café Pasadito',
    description: 'Auténtico café pasado para acompañar tu sánguche.',
    price: 5,
    category: 'BEBIDAS',
    image: 'https://picsum.photos/seed/cafe/400/300',
    tags: ['desayuno', 'caliente']
  }
];
