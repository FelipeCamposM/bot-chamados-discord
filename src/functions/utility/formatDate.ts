import { format, toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export function formatDate(date: Date | string) {
    const zonedDate = typeof date === "string" ? toZonedTime(new Date(date), "America/Sao_Paulo") : toZonedTime(date, "America/Sao_Paulo");
    return format(zonedDate, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR });
}
