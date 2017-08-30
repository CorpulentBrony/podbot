export function enumerable(isEnumerable: boolean) {
	return function (target: object, key: string, descriptor: PropertyDescriptor) { descriptor.enumerable = isEnumerable; }
}

export function writable(isWritable: boolean) {
	return function (target: object, key: string, descriptor: PropertyDescriptor) { descriptor.writable = isWritable; }
}
