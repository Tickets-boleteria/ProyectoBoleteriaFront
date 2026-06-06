/**
 * SupabaseBusRepository.ts - Implementación para gestionar la entidad Bus.
 * Adaptado al esquema real de Supabase con tablas y columnas PascalCase.
 */

import { supabase } from "../Api/supabaseClient";
import { Bus, BusAsiento } from "../../Domain/Entities/Bus";
import type {
	IBusRepository,
	BusFiltros,
} from "../../Domain/Repositories/IBusRepository";
import { DomainException } from "../../Domain/Exceptions/DomainException";

const getFieldValue = (obj: any, fieldName: string) => {
	if (!obj) return undefined;
	const key = Object.keys(obj).find(
		(k) => k.toLowerCase() === fieldName.toLowerCase(),
	);
	return key ? obj[key] : undefined;
};

export class SupabaseBusRepository implements IBusRepository {
	private readonly tabla = "Buses";

	async obtenerTodos(): Promise<Bus[]> {
		const { data, error } = await supabase
			.from(this.tabla)
			.select("*")
			.order("Numero", { ascending: true });

		if (error) {
			throw new DomainException(
				`Error al obtener todos los buses: ${error.message}`,
			);
		}

		return (data || []).map((item) => this.mapearBus(item));
	}

	async obtenerPorCooperativa(cooperativaId: number): Promise<Bus[]> {
		const { data, error } = await supabase
			.from(this.tabla)
			.select("*")
			.eq("CooperativaId", cooperativaId)
			.order("Numero", { ascending: true });

		if (error) {
			throw new DomainException(
				`Error al obtener buses de la cooperativa: ${error.message}`,
			);
		}

		return (data || []).map((item) => this.mapearBus(item));
	}

	async obtenerPorId(id: number): Promise<Bus | null> {
		const { data, error } = await supabase
			.from(this.tabla)
			.select("*")
			.eq("Id", id)
			.limit(1);

		if (error) {
			throw new DomainException(
				`Error al obtener bus por ID: ${error.message}`,
			);
		}

		return (data && data.length > 0) ? this.mapearBus(data[0]) : null;
	}

	async obtenerPorPlaca(placa: string): Promise<Bus | null> {
		const { data, error } = await supabase
			.from(this.tabla)
			.select("*")
			.ilike("Placa", placa.trim())
			.limit(1);

		if (error) {
			throw new DomainException(
				`Error al obtener bus por placa: ${error.message}`,
			);
		}

		return (data && data.length > 0) ? this.mapearBus(data[0]) : null;
	}

	async obtenerPorNumero(numero: string): Promise<Bus | null> {
		const { data, error } = await supabase
			.from(this.tabla)
			.select("*")
			.eq("Numero", numero.trim())
			.order("Id", { ascending: false })
			.limit(1);

		if (error) {
			throw new DomainException(
				`Error al obtener bus por número: ${error.message}`,
			);
		}

		return (data && data.length > 0) ? this.mapearBus(data[0]) : null;
	}

	async crear(bus: Bus): Promise<Bus> {
		const { data, error } = await supabase
			.from(this.tabla)
			.insert({
				CooperativaId: bus.cooperativaId,
				Numero: bus.numero,
				Placa: bus.placa,
				MarcaChasis: bus.marcaChasis,
				MarcaCarroceria: bus.marcaCarroceria,
				Anio: bus.anio,
				FotoUrl: bus.fotoUrl,
				TotalAsientos: bus.totalAsientos,
				Estado: bus.estado || "Activo",
				Estructura: bus.estructura || "UnPiso",
			})
			.select()
			.single();

		if (error) {
			throw new DomainException(`Error al crear el bus: ${error.message}`);
		}

		return this.mapearBus(data);
	}

	async actualizar(id: number, bus: Partial<Bus>): Promise<Bus> {
		const datosUpdate: any = {};

		if (bus.cooperativaId !== undefined)
			datosUpdate.CooperativaId = bus.cooperativaId;
		if (bus.numero !== undefined) datosUpdate.Numero = bus.numero;
		if (bus.placa !== undefined) datosUpdate.Placa = bus.placa;
		if (bus.marcaChasis !== undefined)
			datosUpdate.MarcaChasis = bus.marcaChasis;
		if (bus.marcaCarroceria !== undefined)
			datosUpdate.MarcaCarroceria = bus.marcaCarroceria;
		if (bus.anio !== undefined) datosUpdate.Anio = bus.anio;
		if (bus.fotoUrl !== undefined) datosUpdate.FotoUrl = bus.fotoUrl;
		if (bus.totalAsientos !== undefined)
			datosUpdate.TotalAsientos = bus.totalAsientos;
		if (bus.estado !== undefined) datosUpdate.Estado = bus.estado;
		if (bus.estructura !== undefined) datosUpdate.Estructura = bus.estructura;

		const { data, error } = await supabase
			.from(this.tabla)
			.update(datosUpdate)
			.eq("Id", id)
			.select()
			.single();

		if (error) {
			throw new DomainException(`Error al actualizar bus: ${error.message}`);
		}

		return this.mapearBus(data);
	}

	async eliminarLogico(id: number): Promise<void> {
		const { error } = await supabase
			.from(this.tabla)
			.update({ Estado: "Inactivo" })
			.eq("Id", id);

		if (error) {
			throw new DomainException(`Error al desactivar bus: ${error.message}`);
		}
	}

	async obtenerAsientos(busId: number): Promise<BusAsiento[]> {
		const { data, error } = await supabase
			.from("Asientos")
			.select("*")
			.eq("BusId", busId)
			.order("NumeroAsiento", { ascending: true });

		if (error) {
			throw new DomainException(
				`Error al obtener asientos del bus: ${error.message}`,
			);
		}

		return (data || []).map((item) => this.mapearAsiento(item));
	}

	async obtenerAsientosDisponibles(
		busId: number,
		tipo: "NORMAL" | "VIP",
	): Promise<BusAsiento[]> {
		const { data, error } = await supabase
			.from("Asientos")
			.select("*")
			.eq("BusId", busId)
			.eq("Tipo", tipo)
			.order("NumeroAsiento", { ascending: true });

		if (error) {
			throw new DomainException(
				`Error al obtener asientos disponibles: ${error.message}`,
			);
		}

		return (data || []).map((item) => this.mapearAsiento(item));
	}

	async actualizarAsiento(asiento: BusAsiento): Promise<BusAsiento> {
		if (!asiento.id) {
			throw new DomainException("El asiento debe tener ID para actualizarse.");
		}

		const { data, error } = await supabase
			.from("Asientos")
			.update({
				BusId: asiento.busId,
				ConfiguracionId: asiento.configuracionId,
				NumeroAsiento: asiento.numeroAsiento,
				Fila: asiento.fila,
				Columna: asiento.columna,
				Tipo: asiento.tipo,
			})
			.eq("Id", asiento.id)
			.select()
			.single();

		if (error) {
			throw new DomainException(
				`Error al actualizar asiento: ${error.message}`,
			);
		}

		return this.mapearAsiento(data);
	}

	async reservarAsientos(_asientos: BusAsiento[]): Promise<void> {
		// Tu esquema actual no tiene columnas Disponible/PasajeroId en Asientos.
		// La reserva real debe controlarse mediante Boletos/Ventas.
		return;
	}

	async liberarAsientos(_asientos: BusAsiento[]): Promise<void> {
		// Tu esquema actual no tiene columnas Disponible/PasajeroId en Asientos.
		// La liberación real debe controlarse mediante Boletos/Ventas.
		return;
	}

	async buscarDisponibles(
		_ciudadOrigen: string,
		_ciudadDestino: string,
		_fecha: Date,
		filtros?: BusFiltros,
	): Promise<Bus[]> {
		let query = supabase.from(this.tabla).select("*").eq("Estado", "Activo");

		if (filtros?.cooperativaId) {
			query = query.eq("CooperativaId", filtros.cooperativaId);
		}

		const { data, error } = await query.order("Numero", { ascending: true });

		if (error) {
			throw new DomainException(
				`Error al buscar buses disponibles: ${error.message}`,
			);
		}

		return (data || []).map((item) => this.mapearBus(item));
	}

	async marcarFueraDeServicio(
		busId: number,
		_motivo: string,
		_descripcion?: string,
		_replacementBusId?: number,
		_reportadoPor?: string,
	): Promise<Bus> {
		const { data, error } = await supabase
			.from(this.tabla)
			.update({ Estado: "EnMantenimiento" })
			.eq("Id", busId)
			.select()
			.single();

		if (error) {
			throw new DomainException(`Error al marcar bus fuera de servicio: ${error.message}`);
		}

		return this.mapearBus(data);
	}

	async reactivarBus(busId: number, _reactivadoPor: string): Promise<Bus> {
		const { data, error } = await supabase
			.from(this.tabla)
			.update({ Estado: "Activo" })
			.eq("Id", busId)
			.select()
			.single();

		if (error) {
			throw new DomainException(`Error al reactivar bus: ${error.message}`);
		}

		return this.mapearBus(data);
	}

	async obtenerRutasAfectadas(busId: number): Promise<number> {
		const { count, error } = await supabase
			.from("Rutas")
			.select("*", { count: "exact", head: true })
			.eq("BusId", busId)
			.in("Estado", ["Programada", "EnCurso"]);

		if (error) {
			throw new DomainException(`Error al obtener rutas afectadas: ${error.message}`);
		}

		return count || 0;
	}

	private mapearBus(data: any): Bus {
		const bus = new Bus(
			Number(getFieldValue(data, "CooperativaId") || 0),
			String(getFieldValue(data, "Numero") || ""),
			String(getFieldValue(data, "Placa") || ""),
			Number(getFieldValue(data, "TotalAsientos") || 0),
			String(getFieldValue(data, "Estado") || "Activo"),
		);

		bus.id = Number(getFieldValue(data, "Id"));
		bus.marcaChasis = getFieldValue(data, "MarcaChasis");
		bus.marcaCarroceria = getFieldValue(data, "MarcaCarroceria");
		bus.anio = getFieldValue(data, "Anio");
		bus.fotoUrl = getFieldValue(data, "FotoUrl");
		bus.estructura = getFieldValue(data, "Estructura") || "UnPiso";

		const createdAt = getFieldValue(data, "CreatedAt");
		bus.createdAt = createdAt ? new Date(createdAt) : undefined;

		return bus;
	}

	private mapearAsiento(data: any): BusAsiento {
		const asiento = new BusAsiento(
			Number(getFieldValue(data, "BusId") || 0),
			Number(getFieldValue(data, "ConfiguracionId") || 0),
			String(getFieldValue(data, "NumeroAsiento") || ""),
			String(getFieldValue(data, "Tipo") || ""),
		);

		asiento.id = Number(getFieldValue(data, "Id"));
		asiento.fila = getFieldValue(data, "Fila");
		asiento.columna = getFieldValue(data, "Columna");

		return asiento;
	}
}
