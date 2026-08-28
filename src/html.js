export function escapeHtml(value) { // Função para escapar caracteres especiais em uma string para evitar problemas de segurança, como ataques de injeção de HTML
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
