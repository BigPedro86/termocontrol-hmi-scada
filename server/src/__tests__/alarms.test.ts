import { syncAlarmsFromDevice, getActiveAlarms } from '../alarms';
import { db } from '../db';

describe('Alarm Motor', () => {
    beforeAll(() => {
        // Clear active alarms table for tests
        db.prepare('DELETE FROM active_alarms').run();
    });

    afterEach(() => {
        db.prepare('DELETE FROM active_alarms').run();
    });

    it('should trigger new alarms from device', () => {
        const deviceAlarms = [
            { code: 'AQ01_TEMP_H', description: 'Temp Alta', severity: 'H', active: true }
        ];

        syncAlarmsFromDevice(deviceAlarms);

        const active = getActiveAlarms();
        const alarm = active.find(a => a.equipment === 'AQ01' && a.type === 'TEMP_H');
        expect(alarm).toBeDefined();
        expect(alarm?.cleared).toBe(false);
    });

    it('should clear alarms that are no longer active on device', () => {
        // Force the alarm first
        syncAlarmsFromDevice([
            { code: 'AQ01_TEMP_H', description: 'Temp Alta', severity: 'H', active: true }
        ]);

        // Now drop it
        syncAlarmsFromDevice([
            { code: 'AQ01_TEMP_H', description: 'Temp Alta', severity: 'H', active: false }
        ]);

        const active = getActiveAlarms();
        const alarm = active.find(a => a.equipment === 'AQ01' && a.type === 'TEMP_H');
        expect(alarm?.cleared).toBe(true);
    });
});
