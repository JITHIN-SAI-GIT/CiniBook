import { getRowLabel } from '../lib/utils';

const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function SeatMap({ showtime, seats, onToggleSeat, maxSeats }) {
  const { rowsCount, colsCount } = showtime;

  const getSeatCategory = (rowIdx) => {
    if (rowIdx < 3) return 'Silver';
    if (rowIdx >= rowsCount - 2) return 'Platinum';
    return 'Gold';
  };

  return (
    <div className="space-y-6">
      {/* Screen */}
      <div className="text-center">
        <div className="relative mx-auto max-w-md">
          <div className="h-2 bg-gradient-to-r from-transparent via-[#ffd60a]/50 to-transparent rounded-full mb-1" />
          <div className="h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full mb-4" />
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-semibold">
            ◀ SCREEN ▶
          </p>
        </div>
      </div>

      {/* Seat grid */}
      <div className="overflow-x-auto">
        <div className="min-w-fit mx-auto">
          <div className="space-y-2">
            {Array.from({ length: rowsCount }, (_, rowIdx) => {
              const rowLabel = getRowLabel(rowIdx);
              const rowSeats = seats.filter((s) => s.row === rowLabel);
              return (
                <div key={rowLabel} className="flex flex-col mb-1">
                  {/* Category divider if it's the start of a new category */}
                  {rowIdx === 0 && (
                    <div className="text-center text-[10px] text-gray-500 uppercase tracking-widest my-1 border-b border-white/5 pb-1 w-full max-w-sm mx-auto">
                      Silver (₹{showtime.priceSilver})
                    </div>
                  )}
                  {rowIdx === 3 && (
                    <div className="text-center text-[10px] text-[#ffd60a]/70 uppercase tracking-widest my-1 border-b border-[#ffd60a]/10 pb-1 w-full max-w-sm mx-auto mt-4">
                      Gold (₹{showtime.priceGold})
                    </div>
                  )}
                  {rowIdx === rowsCount - 2 && (
                    <div className="text-center text-[10px] text-purple-400 uppercase tracking-widest my-1 border-b border-purple-500/10 pb-1 w-full max-w-sm mx-auto mt-4">
                      Platinum (₹{showtime.pricePlatinum})
                    </div>
                  )}
                  <div className="flex items-center gap-2 justify-center mt-1">
                    <span className="w-5 text-xs text-gray-500 font-mono text-right shrink-0">
                      {rowLabel}
                    </span>
                    <div className="flex gap-1.5">
                      {/* Left section */}
                      {rowSeats
                        .slice(0, Math.floor(colsCount / 3))
                        .map((seat) => (
                          <SeatButton
                            key={seat.label}
                            seat={seat}
                            onToggle={onToggleSeat}
                          />
                        ))}
                      {/* Aisle gap */}
                      <div className="w-4" />
                      {/* Middle section */}
                      {rowSeats
                        .slice(
                          Math.floor(colsCount / 3),
                          Math.ceil((colsCount * 2) / 3)
                        )
                        .map((seat) => (
                          <SeatButton
                            key={seat.label}
                            seat={seat}
                            onToggle={onToggleSeat}
                          />
                        ))}
                      {/* Aisle gap */}
                      <div className="w-4" />
                      {/* Right section */}
                      {rowSeats
                        .slice(Math.ceil((colsCount * 2) / 3))
                        .map((seat) => (
                          <SeatButton
                            key={seat.label}
                            seat={seat}
                            onToggle={onToggleSeat}
                          />
                        ))}
                    </div>
                    <span className="w-5 text-xs text-gray-500 font-mono shrink-0">
                      {rowLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Column numbers */}
          <div className="flex items-center gap-2 justify-center mt-2">
            <span className="w-5" />
            <div className="flex gap-1.5">
              {Array.from({ length: colsCount }, (_, i) => {
                const isLeftSection = i < Math.floor(colsCount / 3);
                const isMiddleSection =
                  i >= Math.floor(colsCount / 3) &&
                  i < Math.ceil((colsCount * 2) / 3);
                const needsLeftGap = i === Math.floor(colsCount / 3);
                const needsRightGap = i === Math.ceil((colsCount * 2) / 3);
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    {needsLeftGap && <div className="w-4" />}
                    {needsRightGap && <div className="w-4" />}
                    <span className="w-7 text-center text-[9px] text-gray-600">
                      {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 pt-2">
        {[
          { color: 'seat-available', label: 'Available' },
          { color: 'seat-selected', label: 'Selected' },
          { color: 'seat-booked', label: 'Booked' },
          { color: 'seat-locked', label: 'Locked (5min)' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-md ${color}`} />
            <span className="text-xs text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeatButton({ seat, onToggle }) {
  const isInteractable =
    seat.status === 'available' || seat.status === 'selected';

  // Custom styling based on category could be added here if needed.
  // For now we use the global seat-available / seat-selected CSS classes.

  return (
    <button
      onClick={() => isInteractable && onToggle(seat.label)}
      disabled={!isInteractable}
      title={seat.label}
      className={`w-7 h-7 rounded-md text-[9px] font-bold transition-all duration-150 border ${
        seat.status === 'selected'
          ? 'seat-selected'
          : seat.status === 'booked'
            ? 'seat-booked'
            : seat.status === 'locked'
              ? 'seat-locked'
              : 'seat-available'
      } ${
        isInteractable
          ? 'cursor-pointer hover:scale-110 active:scale-95'
          : 'cursor-not-allowed'
      }`}
    >
      {seat.status === 'selected' ? '✓' : seat.col}
    </button>
  );
}
