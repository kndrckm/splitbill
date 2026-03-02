/**
 * Utility functions for URL-based state sharing without external dependencies.
 * Uses native btoa/atob with UTF-8 support.
 */

export const encodeShareData = (data: any): string => {
    try {
        const jsonStr = JSON.stringify(data);
        // Encode UTF-8 characters properly before base64
        const utf8Str = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g,
            (match, p1) => String.fromCharCode(parseInt(p1, 16))
        );
        const base64 = btoa(utf8Str);
        // Make base64 URL safe
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (err) {
        console.error("Failed to encode share data", err);
        return "";
    }
};

export const decodeShareData = (encodedData: string): any => {
    try {
        // Restore base64 standard characters
        let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        const utf8Str = atob(base64);
        // Decode UTF-8 string back to JSON
        const jsonStr = decodeURIComponent(utf8Str.split('').map((c) =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        return JSON.parse(jsonStr);
    } catch (err) {
        console.error("Failed to decode share data", err);
        return null;
    }
};
