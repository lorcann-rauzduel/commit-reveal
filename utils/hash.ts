import { keccak256 } from 'js-sha3';

export const hashCombined = (value: string, secret: string) => {
	return '0x' + keccak256(value + secret);
};
