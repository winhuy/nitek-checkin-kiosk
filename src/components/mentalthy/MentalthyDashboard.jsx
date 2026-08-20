import { useState } from 'react';
import SidebarNav from './SidebarNav';
import HeaderBar from './HeaderBar';
import HeroSearchCard from './HeroSearchCard';
import DoctorCard from './DoctorCard';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

const DOCTORS_DATA = [
  {
    id: 1,
    name: 'Dr. Sam Wallfolk',
    specialty: 'Clinical psychologist',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=200&q=80',
    rating: 5.0,
    location: 'New York, USA',
    experienceYears: 10,
    consultationsCount: 1000,
    tags: ['Abuse', 'Depression', 'PTSD'],
    extraTagsCount: 3,
    pricePerHour: 80,
    mode: 'Online/Offline',
  },
  {
    id: 2,
    name: 'Dr. Ben Affleck',
    specialty: 'Military psychologist',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
    rating: 4.1,
    location: 'Los Angeles, USA',
    experienceYears: 4,
    consultationsCount: 400,
    tags: ['Abuse', 'Food', 'Mental Health'],
    extraTagsCount: 2,
    pricePerHour: 50,
    mode: 'Online',
  },
  {
    id: 3,
    name: 'Dr. Sarah Legend',
    specialty: 'Child psychologist',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    rating: 5.0,
    location: 'Chicago, USA',
    experienceYears: 20,
    consultationsCount: 2000,
    tags: ['Abuse', 'Parenting', 'Food'],
    extraTagsCount: 4,
    pricePerHour: 120,
    mode: 'Offline',
  },
  {
    id: 4,
    name: 'Dr. Angela Braun',
    specialty: 'Forensic psychologist',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    rating: 3.0,
    location: 'Philadelphia, USA',
    experienceYears: 2,
    consultationsCount: 100,
    tags: ['Anxieties and Phobias', 'Depression'],
    extraTagsCount: 5,
    pricePerHour: 40,
    mode: 'Offline',
  },
  {
    id: 5,
    name: 'Dr. Dilan McCarter',
    specialty: 'Industrial-Organizational p...',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    rating: 5.0,
    location: 'San Diego, USA',
    experienceYears: 8,
    consultationsCount: 500,
    tags: ['Job and Career', 'Stress'],
    extraTagsCount: 3,
    pricePerHour: 75,
    mode: 'Online/Offline',
  },
  {
    id: 6,
    name: 'Dr. Evan Peters',
    specialty: 'Clinical psychologist',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    rating: 4.1,
    location: 'Houston, USA',
    experienceYears: 3,
    consultationsCount: 400,
    tags: ['Addictions', 'Violence and Agression'],
    extraTagsCount: 2,
    pricePerHour: 50,
    mode: 'Online/Offline',
  },
];

export default function MentalthyDashboard() {
  const [activeTab, setActiveTab] = useState('psychologists');
  const [doctorsList, setDoctorsList] = useState(DOCTORS_DATA);

  const handleSearchFilter = (filters) => {
    // Basic interactive filter example
    if (filters.type === 'all' && filters.city === 'all') {
      setDoctorsList(DOCTORS_DATA);
    } else {
      const filtered = DOCTORS_DATA.filter(doc => {
        const matchesType = filters.type === 'all' || doc.specialty.toLowerCase().includes(filters.type.toLowerCase());
        return matchesType;
      });
      setDoctorsList(filtered.length > 0 ? filtered : DOCTORS_DATA);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f6fa' }}>
      {/* 1. Sidebar Navigation */}
      <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 2. Main Content Area */}
      <main style={{ flex: 1, padding: '24px 36px 48px 36px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {/* Header bar */}
        <HeaderBar username="Sarah" />

        {/* Hero Search Section */}
        <HeroSearchCard onSearch={handleSearchFilter} />

        {/* Section: Best for you */}
        <section aria-labelledby="section-best-for-you">
          {/* Section Heading & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 id="section-best-for-you" style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: '-0.4px' }}>
                Best for you
              </h2>
              <span
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 12,
                }}
              >
                24
              </span>
            </div>

            <button
              type="button"
              onClick={() => alert('Viewing all specialists...')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#e0e7ff',
                color: '#2563eb',
                border: 'none',
                borderRadius: 14,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>See all</span>
              <ChevronRightIcon style={{ width: 14, height: 14, strokeWidth: 2.2 }} />
            </button>
          </div>

          {/* Doctor Cards 3x2 Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 24,
            }}
          >
            {doctorsList.map(doctor => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
