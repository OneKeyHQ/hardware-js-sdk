import { createProtocolMessage, validateProtocolMessage } from '../bridgeProtocolMessage';

describe('createProtocolMessage', () => {
    it('wraps the body in structured protocol-message JSON when the bridge supports it', () => {
        const message = createProtocolMessage(Buffer.from('abcd', 'hex'), 'v1');

        expect(JSON.parse(message)).toEqual({ protocol: 'v1', data: 'abcd', thpState: undefined });
    });

    it('falls back to the raw legacy body when no protocol is given (legacy bridge)', () => {
        const message = createProtocolMessage(Buffer.from('abcd', 'hex'));

        expect(message).toBe('abcd');
    });
});

describe('validateProtocolMessage', () => {
    it('parses a structured protocol-message JSON body', () => {
        const body = JSON.stringify({ protocol: 'v1', data: 'abcd' });

        expect(validateProtocolMessage(body)).toEqual({
            protocol: 'v1',
            data: 'abcd',
            thpState: undefined,
        });
    });

    it('treats a raw hex string as a legacy bridge /call or /read result', () => {
        expect(validateProtocolMessage('abcd')).toEqual({ data: 'abcd' });
    });

    it('treats an empty string as a legacy bridge /write result when withData is false', () => {
        expect(validateProtocolMessage('', false)).toEqual({ data: '' });
    });

    it('rejects a non-hex, non-JSON string as neither a legacy nor a structured message', () => {
        expect(() => validateProtocolMessage('not-hex-or-json')).toThrow(
            'Invalid BridgeProtocolMessage body',
        );
    });
});
