import React, { createContext, useContext, useState, useEffect } from 'react';

export type Team = 'Tim A' | 'Tim B' | 'Tim C';
export type TicketStatus = 'assigned' | 'in_progress' | 'completed';
export type Severity = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
    id: string;
    title: string;
    description: string;
    location: string;
    severity: Severity;
    assignedTeam: Team;
    status: TicketStatus;
    reportedBy: string;
    createdAt: string;
    completionPhoto?: string; // URL or base64 placeholder
    completionNotes?: string;
}

interface MaintenanceContextType {
    tickets: Ticket[];
    createTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'status'>) => void;
    updateTicketStatus: (id: string, status: TicketStatus) => void;
    completeTicket: (id: string, photo: File | null, notes: string) => void;
    getTicketsByTeam: (team: Team) => Ticket[];
    updateTicketTeam?: (id: string, team: Team) => void;
    deleteTicket?: (id: string) => void;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

// Mock initial data
const initialTickets: Ticket[] = [
    {
        id: 'MNT-20240114-001',
        title: 'Kabel Putus di Jl. Merdeka',
        description: 'Laporan warga ada kabel fiber optik putus tertimpa pohon.',
        location: 'Jl. Merdeka No. 45, Klojen, Malang',
        severity: 'urgent',
        assignedTeam: 'Tim A',
        status: 'assigned',
        reportedBy: 'admin',
        createdAt: '2024-01-14 08:30',
    },
    {
        id: 'MNT-20240114-002',
        title: 'Sinyal Hilang Total',
        description: 'Pelanggan melaporkan LOS merah pada modem.',
        location: 'Perumahan Araya Blok C3, Malang',
        severity: 'high',
        assignedTeam: 'Tim B',
        status: 'in_progress',
        reportedBy: 'admin',
        createdAt: '2024-01-14 09:15',
    },
    {
        id: 'MNT-20240114-003',
        title: 'Maintenance ODP',
        description: 'Pembersihan dan perapian kabel di ODP-MLG-056.',
        location: 'Jl. Suhat, Malang',
        severity: 'medium',
        assignedTeam: 'Tim A',
        status: 'assigned',
        reportedBy: 'admin',
        createdAt: '2024-01-14 10:00',
    },
];

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

    const createTicket = (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'status'>) => {
        const newTicket: Ticket = {
            ...ticketData,
            id: `MNT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`,
            createdAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
            status: 'assigned',
        };
        setTickets((prev) => [newTicket, ...prev]);
    };

    const updateTicketStatus = (id: string, status: TicketStatus) => {
        setTickets((prev) =>
            prev.map((t) => (t.id === id ? { ...t, status } : t))
        );
    };

    const completeTicket = (id: string, photo: File | null, notes: string) => {
        setTickets((prev) =>
            prev.map((t) =>
                t.id === id
                    ? {
                        ...t,
                        status: 'completed',
                        completionNotes: notes,
                        completionPhoto: photo ? URL.createObjectURL(photo) : undefined, // For demo purposes
                    }
                    : t
            )
        );
    };

    const updateTicketTeam = (id: string, assignedTeam: Team) => {
        setTickets((prev) =>
            prev.map((t) => (t.id === id ? { ...t, assignedTeam } : t))
        );
    };

    const deleteTicket = (id: string) => {
        setTickets((prev) => prev.filter((t) => t.id !== id));
    };

    const getTicketsByTeam = (team: Team) => {
        return tickets.filter((t) => t.assignedTeam === team);
    };

    return (
        <MaintenanceContext.Provider
            value={{
                tickets,
                createTicket,
                updateTicketStatus,
                completeTicket,
                getTicketsByTeam,
                updateTicketTeam,
                deleteTicket,
            }}
        >
            {children}
        </MaintenanceContext.Provider>
    );
};

export const useMaintenance = () => {
    const context = useContext(MaintenanceContext);
    if (context === undefined) {
        throw new Error('useMaintenance must be used within a MaintenanceProvider');
    }
    return context;
};
