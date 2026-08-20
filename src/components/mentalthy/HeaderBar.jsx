import { BellIcon } from '@heroicons/react/24/outline';

export default function HeaderBar({ username = 'Sarah' }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
        paddingTop: 8,
      }}
    >
      {/* Title Greeting */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>
          Welcome, {username}!
        </h1>
      </div>

      {/* User Actions & Notification Bell */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Notification Bell Button */}
        <button
          type="button"
          aria-label="View 1 unread notification"
          style={{
            position: 'relative',
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease',
          }}
        >
          <BellIcon style={{ width: 22, height: 22, color: '#475569' }} />
          <span
            style={{
              position: 'absolute',
              top: 10,
              right: 12,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              border: '2px solid #ffffff',
            }}
          />
        </button>

        {/* User Profile Avatar */}
        <figure style={{ margin: 0, padding: 0 }}>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
            alt="Sarah's profile avatar"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              display: 'block',
            }}
          />
        </figure>
      </div>
    </header>
  );
}
