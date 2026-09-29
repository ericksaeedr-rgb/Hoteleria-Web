/**
 * =============================================================================
 * MÓDULO JS: xmlService.js
 * =============================================================================
 * Maneja la carga asíncrona (AJAX/Fetch) y el procesamiento del archivo XML
 * de servicios del hotel usando DOMParser, estructuras de control y manejo de errores.
 */

/**
 * Carga el archivo XML de servicios y lo procesa en un arreglo de objetos.
 * @param {string} url - Ruta del archivo XML.
 * @returns {Promise<Array<Object>>} - Arreglo con al menos 5 objetos estructurados.
 */
export async function cargarServiciosXML(url = '/static/data/servicios.xml') {
    try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar el archivo XML (HTTP ${respuesta.status})`);
        }

        const textoXML = await respuesta.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(textoXML, 'text/xml');

        // Manejo de error si el XML está mal formado
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Error al interpretar el contenido XML: archivo mal formado.');
        }

        const categoriasNodos = xmlDoc.querySelectorAll('categoria');
        const listaServicios = [];

        // Iteración sobre los nodos del documento XML
        categoriasNodos.forEach(nodo => {
            const id = nodo.getAttribute('id') || 'SIN-ID';
            const nombre = nodo.querySelector('nombre')?.textContent || 'Sin Nombre';
            const descripcion = nodo.querySelector('descripcion')?.textContent || '';
            const capacidadMax = parseInt(nodo.querySelector('capacidadMax')?.textContent || '1', 10);
            const tarifaBase = parseFloat(nodo.querySelector('tarifaBase')?.textContent || '0.0');

            const serviciosNodos = nodo.querySelectorAll('serviciosIncluidos servicio');
            const serviciosIncluidos = [];
            serviciosNodos.forEach(s => serviciosIncluidos.push(s.textContent.trim()));

            listaServicios.push({
                id,
                nombre,
                descripcion,
                capacidadMax,
                tarifaBase,
                serviciosIncluidos
            });
        });

        return listaServicios;
    } catch (error) {
        console.error('Error en xmlService:', error);
        throw error;
    }
}

/**
 * Filtra el catálogo de servicios XML según capacidad o texto.
 * @param {Array<Object>} catalogo - Arreglo de servicios.
 * @param {number} capacidadMinima - Capacidad requerida.
 * @returns {Array<Object>} - Arreglo filtrado.
 */
export function filtrarPorCapacidad(catalogo, capacidadMinima) {
    if (!Array.isArray(catalogo) || catalogo.length === 0) {
        return [];
    }
    return catalogo.filter(item => item.capacidadMax >= capacidadMinima);
}
