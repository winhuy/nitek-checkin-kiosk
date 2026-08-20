import { useState } from 'react';
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export default function HeroSearchCard({ onSearch }) {
  const [filters, setFilters] = useState({
    type: 'all',
    city: 'all',
    age: '35+',
    gender: 'all',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(filters);
  };

  return (
    <section
      aria-label="Psychologist Finder & Search"
      style={{
        backgroundColor: '#ebf0f7',
        borderRadius: 24,
        padding: '32px 36px',
        marginBottom: 36,
        position: 'relative',
      }}
    >
      {/* Intro Text */}
      <p style={{ fontSize: 15, fontWeight: 500, color: '#475569', margin: '0 0 28px 0', maxWidth: 640, lineHeight: 1.6 }}>
        Find the best psychologist for yourself! Our specialists will help you to find the best decisions for solving your problems!
      </p>

      {/* Floating Search Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: '12px 14px 12px 28px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr)) auto',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Field 1: Type of counseling */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="select-counseling-type" style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>
            Type of counseling
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <select
              id="select-counseling-type"
              value={filters.type}
              onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
              style={{
                width: '100%',
                appearance: 'none',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
                outline: 'none',
                paddingRight: 20,
              }}
            >
              <option value="all">All types</option>
              <option value="clinical">Clinical</option>
              <option value="military">Military</option>
              <option value="child">Child</option>
              <option value="forensic">Forensic</option>
            </select>
            <ChevronDownIcon style={{ width: 14, height: 14, color: '#94a3b8', position: 'absolute', right: 8, bottom: 4, pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Field 2: City */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="select-city" style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>
            City
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <select
              id="select-city"
              value={filters.city}
              onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
              style={{
                width: '100%',
                appearance: 'none',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
                outline: 'none',
                paddingRight: 20,
              }}
            >
              <option value="all">All Cities</option>
              <option value="newyork">New York, USA</option>
              <option value="losangeles">Los Angeles, USA</option>
              <option value="chicago">Chicago, USA</option>
              <option value="philadelphia">Philadelphia, USA</option>
            </select>
            <ChevronDownIcon style={{ width: 14, height: 14, color: '#94a3b8', position: 'absolute', right: 8, bottom: 4, pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Field 3: Age */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="select-age" style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>
            Age
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <select
              id="select-age"
              value={filters.age}
              onChange={(e) => setFilters(f => ({ ...f, age: e.target.value }))}
              style={{
                width: '100%',
                appearance: 'none',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
                outline: 'none',
                paddingRight: 20,
              }}
            >
              <option value="35+">35+</option>
              <option value="25+">25+</option>
              <option value="45+">45+</option>
              <option value="all">All ages</option>
            </select>
            <ChevronDownIcon style={{ width: 14, height: 14, color: '#94a3b8', position: 'absolute', right: 8, bottom: 4, pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Field 4: Gender */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="select-gender" style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>
            Gender
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <select
              id="select-gender"
              value={filters.gender}
              onChange={(e) => setFilters(f => ({ ...f, gender: e.target.value }))}
              style={{
                width: '100%',
                appearance: 'none',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
                outline: 'none',
                paddingRight: 20,
              }}
            >
              <option value="all">All</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
            <ChevronDownIcon style={{ width: 14, height: 14, color: '#94a3b8', position: 'absolute', right: 8, bottom: 4, pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Search Submit Button */}
        <button
          type="submit"
          aria-label="Search psychologists with filters"
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: '#e0e7ff',
            color: '#2563eb',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#e0e7ff';
            e.currentTarget.style.color = '#2563eb';
          }}
        >
          <MagnifyingGlassIcon style={{ width: 22, height: 22, strokeWidth: 2.2 }} />
        </button>
      </form>
    </section>
  );
}
