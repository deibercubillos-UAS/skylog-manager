import { NextResponse } from 'next/server';

export async function GET() {
  // En el futuro, esto puede venir de una tabla 'testimonials' en Supabase
  const testimonials = [
    {
      id: 1,
      name: "Cap. Julián Arenas",
      role: "Director de Operaciones",
      company: "SkyVisual Drone Services",
      content: "BitaFly transformó nuestra gestión documental. Pasar auditorías de la Aerocivil ahora es un proceso de minutos, no de días.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100"
    },
    {
      id: 2,
      name: "Ing. Sandra Milena",
      role: "Gerente SMS",
      company: "AgroTech Solutions",
      content: "La personalización de los protocolos SORA es impresionante. Se adapta exactamente a los riesgos de aspersión que manejamos.",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100"
    },
    {
      id: 3,
      name: "Ricardo Fonseca",
      role: "Piloto Senior",
      company: "Independiente",
      content: "Como piloto independiente, el Plan Piloto gratuito es perfecto. Tengo mi bitácora legal siempre a mano en mi celular.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100"
    }
  ];

  return NextResponse.json(testimonials);
}