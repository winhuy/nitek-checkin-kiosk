import { MapPinIcon, StarIcon } from '@heroicons/react/24/solid';

export default function DoctorCard({ doctor }) {
  const {
    name,
    specialty,
    avatar,
    rating,
    location,
    experienceYears,
    consultationsCount,
    tags = [],
    extraTagsCount = 0,
    pricePerHour,
    mode = 'Online/Offline',
  } = doctor;

  // Determine rating badge color based on score
  const getRatingBadgeStyle = (score) => {
    if (score >= 4.5) return { bg: '#10b981', color: '#ffffff' }; // Emerald green
    if (score >= 4.0) return { bg: '#f59e0b', color: '#ffffff' }; // Amber
    return { bg: '#ef4444', color: '#ffffff' }; // Red
  };

  const ratingStyle = getRatingBadgeStyle(rating);

  return (
    <article
      aria-label={`Doctor profile card for ${name}`}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.07)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.03)';
      }}
    >
      <div>
        {/* Top Info Section: Avatar + Details */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
          <figure style={{ margin: 0, padding: 0 }}>
            <img
              src={avatar}
              alt={`Portrait photo of ${name}`}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </figure>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 2px 0', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </h3>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontWeight: 400 }}>
              {specialty}
            </p>
          </div>
        </div>

        {/* Rating & Location Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          {/* Rating Badge */}
          <span
            style={{
              backgroundColor: ratingStyle.bg,
              color: ratingStyle.color,
              padding: '3px 8px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <StarIcon style={{ width: 11, height: 11 }} />
            {rating.toFixed(1)}
          </span>

          {/* Location */}
          <address style={{ fontStyle: 'normal', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPinIcon style={{ width: 14, height: 14, color: '#94a3b8' }} />
            <span>{location}</span>
          </address>
        </div>

        {/* Experience & Consultations Stats */}
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
          <div>{experienceYears} yrs of exp.</div>
          <div>{consultationsCount}+ consultations</div>
        </div>

        {/* Specialty Tag Pills */}
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tags.map((tag, idx) => (
            <li key={idx}>
              <span
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '5px 12px',
                  borderRadius: 16,
                  display: 'inline-block',
                }}
              >
                {tag}
              </span>
            </li>
          ))}
          {extraTagsCount > 0 && (
            <li>
              <span
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: 16,
                  display: 'inline-block',
                }}
              >
                +{extraTagsCount}
              </span>
            </li>
          )}
        </ul>
      </div>

      {/* Footer Row: Price & Book CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px dashed #f1f5f9' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
            ${pricePerHour}<span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>/h</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
            {mode}
          </div>
        </div>

        <button
          type="button"
          onClick={() => alert(`Booking consultation with ${name}...`)}
          aria-label={`Book consultation with ${name}`}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: 14,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }}
        >
          Book Consultation
        </button>
      </div>
    </article>
  );
}
