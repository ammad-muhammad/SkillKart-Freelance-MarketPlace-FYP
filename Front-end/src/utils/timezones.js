/**
 * Standard list of common timezones for dropdowns
 */
export const timezones = [
    { value: 'UTC-12', label: '(GMT-12:00) International Date Line West' },
    { value: 'UTC-11', label: '(GMT-11:00) Midway Island, Samoa' },
    { value: 'UTC-10', label: '(GMT-10:00) Hawaii' },
    { value: 'UTC-09', label: '(GMT-09:00) Alaska' },
    { value: 'UTC-08', label: '(GMT-08:00) Pacific Time (US & Canada)' },
    { value: 'UTC-07', label: '(GMT-07:00) Mountain Time (US & Canada)' },
    { value: 'UTC-06', label: '(GMT-06:00) Central Time (US & Canada)' },
    { value: 'UTC-05', label: '(GMT-05:00) Eastern Time (US & Canada)' },
    { value: 'UTC-04', label: '(GMT-04:00) Atlantic Time (Canada)' },
    { value: 'UTC-03', label: '(GMT-03:00) Brasilia' },
    { value: 'UTC-02', label: '(GMT-02:00) Mid-Atlantic' },
    { value: 'UTC-01', label: '(GMT-01:00) Azores, Cape Verde Is.' },
    { value: 'UTC+00', label: '(GMT+00:00) London, Dublin, Lisbon, Casablanca' },
    { value: 'UTC+01', label: '(GMT+01:00) Berlin, Brussels, Copenhagen, Madrid, Paris' },
    { value: 'UTC+02', label: '(GMT+02:00) Kaliningrad, South Africa' },
    { value: 'UTC+03', label: '(GMT+03:00) Baghdad, Riyadh, Moscow, St. Petersburg' },
    { value: 'UTC+03.5', label: '(GMT+03:30) Tehran' },
    { value: 'UTC+04', label: '(GMT+04:00) Abu Dhabi, Muscat, Baku, Tbilisi' },
    { value: 'UTC+04.5', label: '(GMT+04:30) Kabul' },
    { value: 'UTC+05', label: '(GMT+05:00) Islamabad, Karachi, Tashkent' },
    { value: 'UTC+05.5', label: '(GMT+05:30) Mumbai, New Delhi, Chennai, Kolkata' },
    { value: 'UTC+05.75', label: '(GMT+05:45) Kathmandu' },
    { value: 'UTC+06', label: '(GMT+06:00) Almaty, Dhaka' },
    { value: 'UTC+06.5', label: '(GMT+06:30) Yangon (Rangoon)' },
    { value: 'UTC+07', label: '(GMT+07:00) Bangkok, Hanoi, Jakarta' },
    { value: 'UTC+08', label: '(GMT+08:00) Beijing, Perth, Singapore, Hong Kong' },
    { value: 'UTC+09', label: '(GMT+09:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk' },
    { value: 'UTC+09.5', label: '(GMT+09:30) Adelaide, Darwin' },
    { value: 'UTC+10', label: '(GMT+10:00) Eastern Australia, Guam, Vladivostok' },
    { value: 'UTC+11', label: '(GMT+11:00) Magadan, Solomon Is., New Caledonia' },
    { value: 'UTC+12', label: '(GMT+12:00) Auckland, Wellington, Fiji, Kamchatka' },
    { value: 'UTC+13', label: '(GMT+13:00) Nuku\'alofa' }
];

export const getCurrentTimezone = () => {
    const offset = -new Date().getTimezoneOffset() / 60;
    const prefix = offset >= 0 ? '+' : '';
    const formattedOffset = `UTC${prefix}${offset}`;
    return timezones.find(tz => tz.value === formattedOffset) || timezones.find(tz => tz.value === 'UTC+00');
};
