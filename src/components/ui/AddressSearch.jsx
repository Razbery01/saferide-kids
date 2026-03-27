import { useRef, useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { loadGoogleMaps, getGoogle } from '../../lib/maps'

export default function AddressSearch({ label, placeholder, value, onChange, required = false }) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [inputValue, setInputValue] = useState(value?.address || '')
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch(() => setLoadError(true))
  }, [])

  useEffect(() => {
    if (!mapsLoaded || !inputRef.current || autocompleteRef.current) return

    const g = getGoogle() || window.google
    if (!g?.maps?.places) {
      setLoadError(true)
      return
    }

    try {
      const autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'za' },
        fields: ['formatted_address', 'geometry', 'name'],
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.geometry) return

        const address = place.formatted_address || place.name || ''
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()

        setInputValue(address)
        onChange({ address, lat, lng })
      })

      autocompleteRef.current = autocomplete

      // Fix z-index: Google Places dropdown renders in a .pac-container
      // that needs to be above our Modal (z-50)
      const style = document.createElement('style')
      style.textContent = '.pac-container { z-index: 9999 !important; }'
      document.head.appendChild(style)

      return () => { document.head.removeChild(style) }
    } catch {
      setLoadError(true)
    }
  }, [mapsLoaded, onChange])

  function handleManualChange(e) {
    setInputValue(e.target.value)
    if (!e.target.value.trim()) {
      onChange({ address: '', lat: null, lng: null })
    }
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-text-primary tracking-tight">{label}</label>
      )}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <MapPin className="h-[18px] w-[18px] text-text-muted group-focus-within:text-primary transition-colors" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleManualChange}
          placeholder={placeholder || 'Search for an address...'}
          required={required}
          autoComplete="off"
          className="w-full rounded-xl border border-border/80 bg-white pl-11 pr-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300"
        />
      </div>
      {loadError && (
        <p className="text-xs text-text-muted">Address search unavailable. Type the address manually.</p>
      )}
    </div>
  )
}
