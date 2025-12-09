import { useState, useEffect } from "react";

// File: App.jsx
// App name: PlayLedger
// Single-file React component using Tailwind CSS classes (assumes Tailwind is configured)

const CRITERIA = [
  {
    key: "story",
    title: "1. Thế giới & Câu chuyện",
    hint: "Có hấp dẫn, mạch lạc, khiến bạn muốn tìm hiểu và theo dõi không?",
  },
  {
    key: "characters",
    title: "2. Nhân vật",
    hint: "Thiết kế, cá tính, diễn xuất, độ cuốn hút của từng nhân vật có khiến bạn gắn bó không?",
  },
  {
    key: "immersion",
    title: "3. Hòa nhập & Nhịp độ (Immersion & Pacing)",
    hint: "Game có khiến bạn đắm chìm, cảm thấy cuốn theo dòng chảy không? Nhịp độ có hợp với tâm trạng và gu của bạn không (không quá chậm, không quá mệt)?",
  },
  {
    key: "gameplay",
    title: "4. Gameplay",
    hint: "Lối chơi có hợp gu, tạo cảm giác vui, thử thách, hoặc đã tay theo kiểu bạn thích không?",
  },
  {
    key: "art",
    title: "5. Đồ họa & Phong cách nghệ thuật",
    hint: "Thẩm mỹ, phối màu, thiết kế, tổng thể visual có hợp gu của bạn không?",
  },
  {
    key: "sound",
    title: "6. Âm thanh & Lồng tiếng",
    hint: "Nhạc nền, hiệu ứng, giọng lồng tiếng có khiến bạn muốn đeo tai nghe để tận hưởng không?",
  },
  {
    key: "resources",
    title: "7. Tài nguyên cần đầu tư (Time & Money)",
    hint: "Game có đòi hỏi nhiều thời gian hoặc nạp tiền nhiều hơn mức bạn thấy thoải mái không?",
  },
  {
    key: "community",
    title: "8. Cộng đồng & Môi trường chơi",
    hint: "Cộng đồng có vui vẻ, thân thiện, ít toxic không?",
  },
  {
    key: "purpose",
    title: "9. Mục đích cá nhân",
    hint: "Game này có phù hợp với nhu cầu hiện tại của bạn (thư giãn, giải trí, đắm chìm, thử thách…) không?",
  },
  {
    key: "mood",
    title: "10. Trạng thái cảm xúc hiện tại",
    hint: "Ngay lúc này, bạn có thực sự muốn chơi loại game này không?",
  },
];

const STORAGE_KEY = "playledger_games_v1";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function parseDateDDMMYY(str) {
  // expects dd/mm/yy or dd/mm/yyyy
  if (!str) return null;
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  let [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (y < 100) {
    // map to 2000+ (simple heuristic)
    y += 2000;
  }
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function getVerdict(total) {
  if (total <= 25) return "Có lẽ không nên chơi.";
  if (total <= 35) return "Có thể thử.";
  if (total <= 45) return "Rất nên chơi.";
  return "Chắc chắn là lựa chọn tốt.";
}

export default function App() {
  const [tab, setTab] = useState("list");
  const [games, setGames] = useState([]);
  const [editingGame, setEditingGame] = useState(null); // for rating modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setGames(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to parse storage", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  }, [games]);

  function addGame(name, imageDataUrl) {
    const g = {
      id: uid(),
      name,
      image: imageDataUrl || null,
      playing: false,
      scoreCached: 0, // latest total out of 50
      evaluations: [], // each: {id, dateISO, scores: {key:0..5}, total}
      deadline: null, // dd/mm/yy string
      mobileRevenue: null,
    };
    setGames((s) => [g, ...s]);
  }

  function deleteGame(id) {
    setGames((s) => s.filter((g) => g.id !== id));
  }

  function openRateModal(game) {
    setEditingGame(game);
  }

  function computeTotal(scores) {
    return CRITERIA.reduce((acc, c) => acc + (scores[c.key] || 0), 0);
  }

  function handleSaveEvaluation(gameId, scores) {
    const total = computeTotal(scores);
    const evalObj = {
      id: uid(),
      dateISO: new Date().toISOString(),
      scores,
      total,
    };
    setPendingSave({ gameId, evalObj });
    setShowConfirm(true);
  }

  function confirmSave() {
    if (!pendingSave) return;
    const { gameId, evalObj } = pendingSave;
    setGames((s) =>
      s.map((g) => {
        if (g.id !== gameId) return g;
        const newEvals = [...(g.evaluations || []), evalObj];
        const latestTotal = evalObj.total;
        return { ...g, evaluations: newEvals, scoreCached: latestTotal };
      })
    );
    setShowConfirm(false);
    setPendingSave(null);
    setEditingGame(null);
  }

  function cancelSave() {
    setShowConfirm(false);
    setPendingSave(null);
  }

  function handleTogglePlaying(id) {
    setGames((s) =>
      s.map((g) => (g.id === id ? { ...g, playing: !g.playing } : g))
    );
  }

  function handleSetDeadline(id, ddmm) {
    setGames((s) => s.map((g) => (g.id === id ? { ...g, deadline: ddmm } : g)));
  }

  function handleSetMobileRevenue(id, rawValue) {
    setGames((s) =>
      s.map((g) => {
        if (g.id !== id) return g;
        if (rawValue === "") {
          return { ...g, mobileRevenue: null };
        }
        const parsed = Number(rawValue);
        return Number.isNaN(parsed)
          ? g
          : {
              ...g,
              mobileRevenue: parsed,
            };
      })
    );
  }

  function sortedListView() {
    // When displaying list tab, sort by score descending
    return [...games].sort((a, b) => {
      // Tick trước không tick
      if (a.playing && !b.playing) return -1;
      if (!a.playing && b.playing) return 1;

      // Cùng tick hoặc cùng không tick: so sánh score giảm dần
      if (b.scoreCached !== a.scoreCached) return b.scoreCached - a.scoreCached;

      // Score bằng nhau: sắp xếp theo tên alphabet
      return a.name.localeCompare(b.name, "vi"); // dùng 'vi' để so sánh tiếng Việt
    });
  }

  function deadlineListView() {
    // only playing games
    const playingGames = games.filter((g) => g.playing);
    const getRevenueValue = (game) => {
      if (typeof game?.mobileRevenue === "number") return game.mobileRevenue;
      const numeric = Number(game?.mobileRevenue);
      return Number.isFinite(numeric) ? numeric : 0;
    };
    // parse date to sort ascending; invalid dates go to end
    playingGames.sort((a, b) => {
      const da = parseDateDDMMYY(a.deadline);
      const db = parseDateDDMMYY(b.deadline);
      if (!da && !db) {
        const revDiff = getRevenueValue(b) - getRevenueValue(a);
        if (revDiff !== 0) return revDiff;
        return b.scoreCached - a.scoreCached; // both no date -> by score desc
      }
      if (!da) return 1;
      if (!db) return -1;
      if (da.getTime() === db.getTime()) {
        const scoreDiff = b.scoreCached - a.scoreCached;
        if (scoreDiff !== 0) return scoreDiff; // same date -> score desc
        return getRevenueValue(b) - getRevenueValue(a); // same score -> revenue desc
      }
      return da - db; // ascending
    });
    return playingGames;
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(games, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "playledger_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Container chính căn giữa */}
      <header className="flex items-center justify-between mb-6 w-full px-4">
        <h1 className="text-2xl font-bold">PlayLedger</h1>
        <div className="flex gap-3">
          <button
            onClick={() => exportData()}
            className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700"
          >
            Export
          </button>
          <AddGameButton onAdd={addGame} />
        </div>
      </header>

      <nav className="flex gap-2 mb-4 w-full px-4">
        <TabButton active={tab === "list"} onClick={() => setTab("list")}>
          Danh sách
        </TabButton>
        <TabButton
          active={tab === "deadline"}
          onClick={() => setTab("deadline")}
        >
          Deadline
        </TabButton>
      </nav>

      {tab === "list" && (
        <div className="bg-gray-800 rounded-lg p-4 w-full overflow-x-auto">
          <table
            className="w-full table-fixed border-collapse"
            style={{ tableLayout: "fixed", minWidth: "2000px" }}
          >
            <thead>
              <tr className="text-left text-sm text-gray-400">
                <th style={{ width: "32px", padding: "8px" }}>#</th>
                <th style={{ width: "32px", padding: "8px" }}>√</th>
                <th style={{ width: "64px", padding: "8px" }}>Cover</th>
                <th style={{ padding: "8px" }}>Name</th>
                <th style={{ padding: "8px" }}>Score</th>
                <th style={{ padding: "8px", paddingLeft: "40px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedListView().map((g, i) => (
                <tr key={g.id} className="border-t border-gray-700">
                  <td style={{ padding: "8px" }}>{i + 1}</td>
                  <td style={{ padding: "8px" }}>
                    <input
                      type="checkbox"
                      checked={!!g.playing}
                      onChange={() => handleTogglePlaying(g.id)}
                    />
                  </td>
                  <td style={{ padding: "8px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        backgroundColor: "#374151",
                        borderRadius: "0.25rem",
                        overflow: "hidden",
                      }}
                    >
                      {g.image ? (
                        <img
                          src={g.image}
                          alt="cover"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.625rem",
                            color: "#9ca3af",
                          }}
                        >
                          No image
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "8px" }}>{g.name}</td>
                  <td style={{ padding: "8px", fontSize: "0.875rem" }}>
                    {((g.scoreCached / 50) * 10).toFixed(1)}/10
                  </td>
                  <td style={{ padding: "8px" }}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openRateModal(g)}
                        className="px-2 py-1 rounded bg-indigo-600 text-white"
                      >
                        Đánh giá
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Xóa game này?")) deleteGame(g.id);
                        }}
                        className="px-2 py-1 rounded bg-red-600 text-white"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "deadline" && (
        <div className="bg-gray-800 rounded-lg p-4 w-full overflow-x-auto">
          {deadlineListView().length === 0 && (
            <div className="text-gray-400">
              Không có game đang chơi (ticked).
            </div>
          )}
          <div style={{ minWidth: "1400px" }}>
            <table
              className="w-full table-fixed border-collapse"
              style={{ tableLayout: "fixed", minWidth: "1400px" }}
            >
              <thead>
                <tr className="text-left text-sm text-gray-400">
                  <th style={{ width: "64px", padding: "8px" }}>Cover</th>
                  <th style={{ padding: "8px" }}>Name</th>
                  <th style={{ width: "200px", padding: "8px" }}>Deadline</th>
                  <th style={{ width: "200px", padding: "8px" }}>Mobile revenue (million)</th>
                </tr>
              </thead>
              <tbody>
                {deadlineListView().map((g) => (
                  <tr key={g.id} className="border-t border-gray-700">
                    <td style={{ padding: "8px" }}>
                      <div className="w-12 h-12 rounded overflow-hidden bg-gray-700">
                        {g.image ? (
                          <img
                            src={g.image}
                            alt="c"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                            No
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "8px" }} className="max-w-[60ch]">
                      <div className="font-medium truncate">{g.name}</div>
                    </td>
                    <td style={{ padding: "8px", width: "200px" }}>
                      <input
                        value={g.deadline || ""}
                        onChange={(e) =>
                          handleSetDeadline(g.id, e.target.value)
                        }
                        placeholder="dd/mm/yy"
                        className="w-full rounded px-2 py-1 bg-gray-900 text-gray-100 border border-gray-700"
                      />
                    </td>
                    <td style={{ padding: "8px", width: "200px" }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={g.mobileRevenue ?? ""}
                        onChange={(e) =>
                          handleSetMobileRevenue(g.id, e.target.value)
                        }
                        placeholder="0"
                        className="w-full rounded px-2 py-1 bg-gray-900 text-gray-100 border border-gray-700"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rating modal */}
      {editingGame && (
        <RatingModal
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSave={handleSaveEvaluation}
        />
      )}

      {/* Confirm modal */}
      {showConfirm && pendingSave && (
        <ConfirmModal
          text={`Bạn có chắc chắn muốn lưu kết quả này cho game?`}
          onCancel={cancelSave}
          onConfirm={confirmSave}
        />
      )}
    </div>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded ${
        active ? "bg-indigo-600" : "bg-gray-800 hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function AddGameButton({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [imgData, setImgData] = useState(null);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 48; // 48x48px
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        // resize và crop để vừa canvas
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/png");
        setImgData(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  }

  function submit() {
    if (!name.trim()) {
      alert("Nhập tên game");
      return;
    }
    onAdd(name.trim(), imgData);
    setName("");
    setImgData(null);
    setOpen(false);
  }

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 rounded bg-green-600"
      >
        Thêm game
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-900 p-4 rounded max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Thêm game mới</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên game"
              className="w-full mb-2 px-2 py-1 bg-gray-800 rounded"
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="mb-2"
            />
            {imgData && (
              <div className="mb-2 w-24 h-24 overflow-hidden rounded">
                <img
                  src={imgData}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1 rounded bg-gray-700"
              >
                Hủy
              </button>
              <button
                onClick={submit}
                className="px-3 py-1 rounded bg-green-600"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RatingModal({ game, onClose, onSave }) {
  const [scores, setScores] = useState(() => {
    // init zeros or load last evaluation
    const last =
      game.evaluations && game.evaluations[game.evaluations.length - 1];
    if (last) {
      const s = {};
      CRITERIA.forEach((c) => (s[c.key] = last.scores[c.key] ?? 0));
      return s;
    }
    const s = {};
    CRITERIA.forEach((c) => (s[c.key] = 0));
    return s;
  });

  function setScore(key, value) {
    setScores((p) => ({ ...p, [key]: Number(value) }));
  }

  const total = CRITERIA.reduce((acc, c) => acc + (scores[c.key] || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-3xl w-full p-4 overflow-auto max-h-[90vh]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Đánh giá: {game.name}</h2>

          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-2 py-1 bg-gray-700 rounded">
              Đóng
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {CRITERIA.map((c) => (
            <div key={c.key} className="bg-gray-800 p-3 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-gray-400 text-sm">{c.hint}</div>
                </div>
                <div className="w-40">
                  <label className="text-xs text-gray-400 mr-2">0–5</label>
                  <select
                    value={scores[c.key]}
                    onChange={(e) => setScore(c.key, e.target.value)}
                    className="bg-gray-900 px-2 py-1 rounded"
                  >
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-gray-800 p-3 rounded">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Tổng</div>
                <div className="text-gray-400 text-sm">{getVerdict(total)}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{total}/50</div>
                <div className="text-gray-400 text-sm">
                  {((total / 50) * 10).toFixed(1)}/10
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded bg-gray-700">
              Hủy
            </button>
            <button
              onClick={() => onSave(game.id, scores)}
              className="px-3 py-1 rounded bg-indigo-600"
            >
              Lưu đánh giá
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ text, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-gray-900 p-4 rounded max-w-sm w-full">
        <div className="text-lg font-medium mb-3">Xác nhận</div>
        <div className="text-gray-300 mb-4">{text}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 rounded bg-gray-700">
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1 rounded bg-green-600"
          >
            Chắc chắn lưu
          </button>
        </div>
      </div>
    </div>
  );
}
