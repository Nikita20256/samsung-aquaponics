/**
 * Админ-панель — страница управления системой
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { UsersIcon, AquaponicsIcon, AdminIcon, ChartIcon, SearchIcon } from './AdminIcons';
import './Admin.css';

export default function Admin() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [isAdmin, setIsAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('stats');

    // Data
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [devices, setDevices] = useState([]);

    // Search
    const [userSearch, setUserSearch] = useState('');
    const [deviceSearch, setDeviceSearch] = useState('');

    // Forms & State
    const [newDevice, setNewDevice] = useState({ deviceId: '', secret: '' });
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);

    // Проверка прав
    useEffect(() => {
        const checkAccess = async () => {
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const result = await adminService.checkAdmin();
                setIsAdmin(result.isAdmin);
                if (!result.isAdmin) {
                    navigate('/dashboard');
                }
            } catch (err) {
                console.error('Admin check failed:', err);
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, [token, navigate]);

    // Загрузка данных
    const loadData = useCallback(async () => {
        if (!isAdmin) return;

        setError(null);
        try {
            const [statsData, usersData, devicesData] = await Promise.all([
                adminService.getStats(),
                adminService.getUsers(),
                adminService.getDevices(),
            ]);
            setStats(statsData);
            setUsers(usersData.users);
            setDevices(devicesData.devices);
        } catch (err) {
            setError('Ошибка загрузки данных');
            console.error(err);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (isAdmin) {
            loadData();
        }
    }, [isAdmin, loadData]);

    // Handlers: Users
    const handleToggleAdmin = async (userId) => {
        setActionLoading(userId);
        try {
            await adminService.toggleAdmin(userId);
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка изменения прав');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteUser = async (userId, login) => {
        if (!window.confirm(`Удалить пользователя ${login}? Это действие необратимо.`)) return;

        setActionLoading(userId);
        try {
            await adminService.deleteUser(userId);
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка удаления');
        } finally {
            setActionLoading(null);
        }
    };

    // Handlers: Devices
    const handleCreateDevice = async (e) => {
        e.preventDefault();
        if (!newDevice.deviceId || !newDevice.secret) return;

        setActionLoading('create-device');
        try {
            await adminService.createDevice(newDevice.deviceId, newDevice.secret);
            setNewDevice({ deviceId: '', secret: '' });
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка создания устройства');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteDevice = async (deviceId) => {
        if (!window.confirm(`Удалить устройство ${deviceId} и все его данные? Это действие необратимо.`)) return;

        setActionLoading(`del-dev-${deviceId}`);
        try {
            await adminService.deleteDevice(deviceId);
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка удаления устройства');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnbindDevice = async (deviceId, userId, userLogin) => {
        if (!window.confirm(`Отвязать устройство ${deviceId} от пользователя ${userLogin}?`)) return;

        setActionLoading(`unbind-${deviceId}-${userId}`);
        try {
            await adminService.unbindDevice(deviceId, userId);
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка отвязки устройства');
        } finally {
            setActionLoading(null);
        }
    };


    if (loading || isAdmin === null) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>Проверка доступа...</p>
            </div>
        );
    }

    const statCards = [
        {
            label: 'Пользователей на сайте:',
            value: stats?.totalUsers ?? 0,
            icon: <UsersIcon size={56} />,
        },
        {
            label: 'Количество подключенных устройств:',
            value: stats?.totalDevices ?? 0,
            icon: <AquaponicsIcon size={56} />,
        },
        {
            label: 'Количество администраторов:',
            value: stats?.totalAdmins ?? 0,
            icon: <AdminIcon size={56} />,
        },
        {
            label: 'Количество записей за день:',
            value: stats?.recordsLast24h ?? 0,
            icon: <ChartIcon size={56} />,
        },
    ];

    return (
        <div className="admin-page">
            <div className="admin-container">
                <header className="admin-header">
                    <h1 className="admin-title">Панель администратора</h1>
                </header>

                {error && (
                    <div className="admin-error">
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {/* Tabs */}
                <nav className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
                        onClick={() => setActiveTab('stats')}
                    >
                        Статистика
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Пользователи
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'devices' ? 'active' : ''}`}
                        onClick={() => setActiveTab('devices')}
                    >
                        Устройства
                    </button>
                </nav>

                {/* Stats Tab */}
                {activeTab === 'stats' && stats && (
                    <div className="admin-stats-grid">
                        {statCards.map((card, idx) => (
                            <div className="stat-card" key={idx}>
                                <div className="stat-header">{card.label}</div>
                                <div className="stat-value">{card.value}</div>
                                <div className="stat-icon-wrap">{card.icon}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <>
                        <div className="admin-search-box">
                            <SearchIcon size={18} color="#6b8a83" />
                            <input
                                type="text"
                                placeholder="Поиск по логину или email..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                className="admin-search-input"
                            />
                        </div>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Логин</th>
                                        <th>Email</th>
                                        <th>ID Устройств</th>
                                        <th>Админ</th>
                                        <th>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.filter(user => {
                                        const q = userSearch.toLowerCase();
                                        return !q ||
                                            user.login.toLowerCase().includes(q) ||
                                            (user.email && user.email.toLowerCase().includes(q)) ||
                                            String(user.id).includes(q);
                                    }).map(user => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td>{user.login}</td>
                                        <td>{user.email || '—'}</td>
                                        <td>
                                            {user.devices && user.devices.length > 0 ? (
                                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                    {user.devices.map(d => (
                                                        <code key={d}>{d}</code>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${user.isAdmin ? 'badge-success' : 'badge-muted'}`}>
                                                {user.isAdmin ? 'Да' : 'Нет'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="action-btn action-btn--toggle"
                                                    onClick={() => handleToggleAdmin(user.id)}
                                                    disabled={actionLoading === user.id}
                                                >
                                                    {user.isAdmin ? 'Снять' : 'Назначить'}
                                                </button>
                                                <button
                                                    className="action-btn action-btn--delete"
                                                    onClick={() => handleDeleteUser(user.id, user.login)}
                                                    disabled={actionLoading === user.id}
                                                >
                                                    Удалить
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}

                {/* Devices Tab */}
                {activeTab === 'devices' && (
                    <>
                        <div className="admin-search-box">
                            <SearchIcon size={18} color="#6b8a83" />
                            <input
                                type="text"
                                placeholder="Поиск по ID устройства или пользователю..."
                                value={deviceSearch}
                                onChange={(e) => setDeviceSearch(e.target.value)}
                                className="admin-search-input"
                            />
                        </div>
                        <form className="device-form" onSubmit={handleCreateDevice}>
                            <input
                                type="text"
                                placeholder="ID устройства (например: dev1)"
                                value={newDevice.deviceId}
                                onChange={(e) => setNewDevice(prev => ({ ...prev, deviceId: e.target.value }))}
                                className="form-input"
                            />
                            <input
                                type="text"
                                placeholder="Ключ привязки (секретный код)"
                                value={newDevice.secret}
                                onChange={(e) => setNewDevice(prev => ({ ...prev, secret: e.target.value }))}
                                className="form-input"
                            />
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={actionLoading === 'create-device'}
                            >
                                + Создать устройство
                            </button>
                        </form>

                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Device ID</th>
                                        <th>Привязан к пользователю</th>
                                        <th>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devices.filter(device => {
                                        const q = deviceSearch.toLowerCase();
                                        const userNames = (device.users || []).map(u => u.login.toLowerCase()).join(' ');
                                        return !q ||
                                            device.deviceId.toLowerCase().includes(q) ||
                                            userNames.includes(q);
                                    }).map(device => (
                                        <tr key={device.id}>
                                            <td><code>{device.deviceId}</code></td>
                                            <td>
                                                {device.users && device.users.length > 0 ? (
                                                    <div className="device-users-list">
                                                        {device.users.map(u => (
                                                            <span key={u.id} className="device-user-tag">
                                                                {u.login}
                                                                <button
                                                                    className="btn-unbind"
                                                                    title="Отвязать устройство"
                                                                    disabled={actionLoading === `unbind-${device.id}-${u.id}`}
                                                                    onClick={() => handleUnbindDevice(device.id, u.id, u.login)}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">Нет привязок</span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className="action-btn action-btn--delete"
                                                    onClick={() => handleDeleteDevice(device.id)}
                                                    disabled={actionLoading === `del-dev-${device.id}`}
                                                >
                                                    Удалить
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <style jsx>{`
                .device-users-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .device-user-tag {
                    display: inline-flex;
                    align-items: center;
                    background: rgba(19, 137, 98, 0.08);
                    color: #0f2925;
                    padding: 4px 10px;
                    border-radius: 16px;
                    font-size: 0.9em;
                    font-weight: 500;
                    border: 1px solid rgba(19, 137, 98, 0.15);
                }
                .btn-unbind {
                    background: none;
                    border: none;
                    color: #c0392b;
                    margin-left: 6px;
                    cursor: pointer;
                    font-size: 1.1em;
                    line-height: 1;
                    padding: 0;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }
                .btn-unbind:hover {
                    opacity: 1;
                    font-weight: bold;
                }
            `}</style>
        </div>
    );
}
