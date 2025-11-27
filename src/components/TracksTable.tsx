import { useAppContext } from "../contexts/app.context";

export default function TracksTable() {
  const { trackSheet } = useAppContext();

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>
              <label>
                <input type="checkbox" className="checkbox" />
              </label>
            </th>
            <th>No</th>
            <th>Title</th>
            <th>Performer</th>
          </tr>
        </thead>
        <tbody>
          {trackSheet.map((track, index) => (
            <tr key={track.no}>
              <th>
                <label>
                  <input type="checkbox" className="checkbox" />
                </label>
              </th>
              <td>{index + 1}</td>
              <td>{track.title}</td>
              <td>{track.performer}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
