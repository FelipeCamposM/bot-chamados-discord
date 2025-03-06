export function formatDate(date: string | Date): string {
    if (date !== null){
        // Verifique se a data é uma string, e converta para Date se necessário
    const dateObj = typeof date === "string" ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
    // Caso a conversão para Date falhe (data inválida), retorne uma string padrão
    return "Data inválida";
    }

    const localDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);

    const day = String(localDate.getDate()).padStart(2, "0"); // Dia com dois dígitos
    const month = String(localDate.getMonth() + 1).padStart(2, "0"); // Mês com dois dígitos
    const year = localDate.getFullYear(); // Ano

    return `${day}/${month}/${year}`; // Retorna a data formatada como DD/MM/YYYY
    } else {
        return date = "Não informado";
    }
}