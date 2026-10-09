// Barrios cerrados / countries organizados por zona → partido → localidad
// Agregar entradas siguiendo la misma estructura para ampliar el listado.
// Las claves DEBEN coincidir exactamente con los valores de geoData.js.

const BARRIOS_CERRADOS = {
  'Buenos Aires': {
    'Pilar': {
      'Pilar': [
        'Altos de la Cascada',
        'Ayres de Pilar',
        'Club de Campo Los Lagartos',
        'El Cantón',
        'El Ensueño',
        'Haras del Sur',
        'La Cascada Country Club',
        'Las Vistas',
        'Nordelta del Pilar',
        'Pilar del Este',
        'Pilar Golf Club',
        'San Marcos',
        'Santa Bárbara',
        'Tortugas Country Club',
        'Villa Nueva Country Club',
        'Yencomecó',
      ],
      'Del Viso': [
        'Alta Vista Country Club',
        'Estancias del Pilar',
        'Highland Park',
        'Mapuche Country Club',
        'Portal de Pilar',
        'Saint Thomas',
        'Valle del Pilar',
      ],
      'Presidente Derqui': [
        'Las Praderas del Pilar',
        'Los Aromos',
        'San Patricio del Chañar',
      ],
      'Manuel Alberti': [
        'Altos de Alberti',
        'Los Robles del Pilar',
      ],
      'Fatima': [
        'El Encuentro',
        'El Sosiego del Pilar',
        'Haras de la Providencia',
      ],
      'Villa Rosa': [
        'El Remanso',
        'Los Caldenes',
      ],
    },
    'Tigre': {
      'Nordelta': [
        'Nordelta - Bahía Serena',
        'Nordelta - El Golf',
        'Nordelta - Islas del Sol',
        'Nordelta - La Bahía',
        'Nordelta - La Comarca',
        'Nordelta - La Laguna',
        'Nordelta - Las Glicinas',
        'Nordelta - Las Palmas',
        'Nordelta - Los Eucaliptos',
        'Nordelta - Los Naranjos',
        'Nordelta - San Marcos',
        'Nordelta - Villa del Lago',
      ],
      'Benavídez': [
        'Arenas del Sur',
        'Bahía Serena',
        'Country Los Sauces',
        'Las Residencias del Río',
        'Ribera del Talar',
        'Santa Lucía',
      ],
      'Don Torcuato': [
        'Las Lomas de Don Torcuato',
        'Los Algarrobos',
        'Punta Chica',
        'Santa María del Tigre',
      ],
      'El Talar': [
        'Bosques del Talar',
        'El Talar Country Club',
        'Las Villas del Talar',
      ],
      'General Pacheco': [
        'Alturas de Pacheco',
        'Los Eucaliptos de Pacheco',
        'Parque Leloir',
      ],
      'Rincón de Milberg': [
        'Club de Campo San Diego',
        'Del Viso (sector Milberg)',
        'Los Alamos del Delta',
      ],
      'Tigre': [
        'Country Club Palmas del Río',
        'Delta del Tigre',
        'Villa Gobernador Udaondo',
      ],
    },
    'Escobar': {
      'Ingeniero Maschwitz': [
        'Arenas del Norte',
        'La Cava del Maschwitz',
        'Maqui Barrio',
        'Monteverde',
        'Palmares de Maschwitz',
        'Terrazas de Maschwitz',
      ],
      'Belén de Escobar': [
        'Aruba Beach',
        'El Mirasol',
        'Las Camelias de Escobar',
      ],
      'Garín': [
        'Club de Campo Los Alamos',
        'Garín Haras',
      ],
      'Maquinista F. Savio': [
        'El Rincón de Savio',
        'Las Acacias Country Club',
      ],
      'Open Door': [
        'Open Door Country Club',
      ],
    },
    'San Isidro': {
      'Martínez': [
        'Los Alamos de Martínez',
        'San Isidro Labrador',
      ],
      'La Horqueta': [
        'La Horqueta Country Club',
        'Las Lomas de San Isidro',
      ],
      'Beccar': [
        'Beccar Country Club',
        'Las Palmas de Beccar',
      ],
    },
    'San Fernando': {
      'Victoria': [
        'Villa La Angostura del Paraná',
        'Virreyes Country Club',
      ],
    },
    'Cañuelas': {
      'Cañuelas': [
        'El Lauquen Country Club',
        'Maiten Country Club',
        'Pampa Golf Club',
      ],
      'Gobernador Castro': [
        'El Señorío de los Reartes',
      ],
    },
    'Ezeiza': {
      'Ezeiza': [
        'Abril Country Club',
        'El Fortín',
        'La Morita',
        'Los Eucaliptos Country Club',
        'San Eduardo del Mar',
      ],
      'Carlos Spegazzini': [
        'El Sosiego Country Club',
        'Las Golondrinas',
      ],
    },
    'Presidente Perón': {
      'Guernica': [
        'El Paraíso Country Club',
        'Las Cabañas Country',
        'Los Hornos Country Club',
      ],
    },
    'Luján': {
      'Luján': [
        'Club de Campo Las Casuarinas',
        'El Bosque Country Club',
      ],
      'Open Door': [
        'Estancias La Delfina',
        'Santa Ana de Luján',
      ],
      'Carlos Keen': [
        'Los Aromos del Luján',
      ],
    },
    'Moreno': {
      'La Reja': [
        'El Paraíso de La Reja',
        'Los Lagartos Country Club',
        'Rancho Grande',
      ],
      'Francisco Álvarez': [
        'Country Club El Camino',
        'Los Pilares',
      ],
    },
    'General Rodríguez': {
      'General Rodríguez': [
        'Club de Campo Los Potrillos',
        'Country El Ombú',
        'Las Praderas de Rodríguez',
      ],
      'La Lonja': [
        'La Lomada Country Club',
        'Los Pehuenes',
      ],
    },
    'Marcos Paz': {
      'Marcos Paz': [
        'Club de Campo Los Pingüinos',
        'El Descanso Country Club',
        'Parque San Jorge',
      ],
    },
    'Brandsen': {
      'Jeppener': [
        'El Cardal',
        'Laguna Club de Campo',
      ],
    },
    'Colón': {
      'Los Cardales': [
        'Club de Campo Los Cardales',
        'Estancias Los Cardales',
        'Los Pinos de Los Cardales',
      ],
    },
    'Exaltación de la Cruz': {
      'Cardales': [
        'El Cardal de Los Cardales',
        'Estancias del Pago Chico',
      ],
      'Capilla del Señor': [
        'Club de Campo Las Magnolias',
      ],
    },
    'La Plata': {
      'City Bell': [
        'El Dorado Country Club',
        'Los Corales Country Club',
        'Villa El Toro',
      ],
      'Gonnet': [
        'La Estancia de Gonnet',
        'Los Cipreses de Gonnet',
      ],
      'La Plata': [
        'Country Club La Cuesta',
      ],
    },
    'Berazategui': {
      'Ranelagh': [
        'Country Club Ranelagh',
        'Los Robles de Ranelagh',
      ],
    },
    'Zárate': {
      'Zárate': [
        'Club de Campo del Zárate',
        'Los Talas del Río',
      ],
    },
    'Campana': {
      'Campana': [
        'Laguna del Sol',
        'Las Praderas de Campana',
      ],
    },
  },
  'Córdoba': {
    'Capital': {
      'Córdoba': [
        'Brisas del Cerro',
        'La Reserva de Córdoba',
        'Quintas de Urca',
        'Urca Country Club',
        'Villa Warcalde',
      ],
      'Mendiolaza': [
        'El Dorado de Mendiolaza',
        'La Arboleda',
        'Las Quintas de la Reserva',
        'Pillahuincó',
        'Valle del Lago',
      ],
      'Villa Allende': [
        'El Camino Real',
        'Los Altos de la Cañada',
        'Residencia de los Altos',
        'Via Serrana',
        'Villa Allende Park',
      ],
      'Unquillo': [
        'Club de Campo Unquillo',
        'El Terraplén',
      ],
    },
    'Colón': {
      'Villa Allende': [
        'Lomas de Villa Allende',
        'Valle del Lago Colón',
      ],
      'Cosquín': [
        'Country Cosquín',
        'Los Alisos de Cosquín',
      ],
    },
    'Punilla': {
      'Villa Carlos Paz': [
        'Altos de Villa Carlos Paz',
        'Country Carlos Paz',
      ],
      'La Cumbre': [
        'Los Aromos de La Cumbre',
      ],
    },
  },
  'Santa Fe': {
    'Rosario': {
      'Funes': [
        'Funes Hills Country Club',
        'La Reserva del Bosque',
        'Las Mañanitas de Funes',
        'Lomas de Funes',
        'Nuevo Funes',
      ],
      'Roldán': [
        'Arenas del Paraná',
        'Golf & Country Club Roldán',
        'Villa Golf',
      ],
      'Granadero Baigorria': [
        'Costa Grande',
      ],
    },
    'La Capital': {
      'Santa Fe': [
        'Country Club Los Espinillos',
        'El Recreo Country Club',
      ],
    },
  },
  'Mendoza': {
    'Luján de Cuyo': {
      'Chacras de Coria': [
        'Dalvian Country Club',
        'Las Compuertas',
        'Los Álamos de Chacras',
        'Los Cedros de Chacras',
      ],
      'Mayor Drummond': [
        'El Algarrobal Country Club',
      ],
    },
    'Godoy Cruz': {
      'Godoy Cruz': [
        'Country Club El Cepillo',
        'Las Higueras Country Club',
      ],
    },
    'Guaymallén': {
      'Guaymallén': [
        'Los Almendros Country Club',
      ],
    },
  },
  'Tucumán': {
    'Capital': {
      'San Miguel de Tucumán': [
        'Altos de Yerba Buena',
        'La Reserva Tucumán',
      ],
    },
    'Yerba Buena': {
      'Yerba Buena': [
        'Alto San Javier',
        'Club de Campo Yerba Buena',
        'Country El Remanso',
        'Las Lagunas Country Club',
        'Los Ceibos',
      ],
      'El Manantial': [
        'El Manantial Country Club',
        'Las Lomas del Manantial',
      ],
    },
  },
  'Salta': {
    'Capital': {
      'Salta': [
        'Altos del Country Salta',
        'Club El Tipal',
        'Country Club El Ceibal',
        'El Huaico Country Club',
      ],
    },
  },
  'Neuquén': {
    'Confluencia': {
      'Neuquén': [
        'Bosques de Neuquén',
        'Country Club Los Lapachos',
      ],
      'Plottier': [
        'Altos del Limay',
        'Club del Río',
      ],
    },
  },
};

export function getBarriosCerrados(zona, partido, localidad) {
  return BARRIOS_CERRADOS[zona]?.[partido]?.[localidad] || [];
}

export default BARRIOS_CERRADOS;
