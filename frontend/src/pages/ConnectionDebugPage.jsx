import { useState } from "react";

// ConnectionDebugPage.jsx
const ConnectionDebugPage = () => {
    const [connections, setConnections] = useState([]);

    useEffect(() => {
        fetch('http://localhost:5000/api/debug/connections')
            .then(res => res.json())
            .then(data => setConnections(data.connections));

        const interval = setInterval(() => {
            fetch('http://localhost:5000/api/debug/connections')
                .then(res => res.json())
                .then(data => setConnections(data.connections));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4">
            <h1>Active Connections ({connections.length})</h1>
            <table className="w-full mt-4 border-collapse">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border p-2">Socket ID</th>
                        <th className="border p-2">Role</th>
                        <th className="border p-2">Team</th>
                        <th className="border p-2">Connected At</th>
                    </tr>
                </thead>
                <tbody>
                    {connections.map(client => (
                        <tr key={client.id}>
                            <td className="border p-2">{client.id}</td>
                            <td className="border p-2">{client.role}</td>
                            <td className="border p-2">{client.team || '-'}</td>
                            <td className="border p-2">{new Date(client.connectedAt).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ConnectionDebugPage