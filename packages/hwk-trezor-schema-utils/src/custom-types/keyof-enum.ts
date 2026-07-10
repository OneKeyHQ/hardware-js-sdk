import {
    Hint,
    JavaScriptTypeBuilder,
    type SchemaOptions,
    type TEnum,
    type TEnumKey,
    type TEnumValue,
    type TLiteral,
    type TUnion,
} from '@sinclair/typebox';

// TLiteral<"a" | "b"> => TLiteral<"a"> | TLiteral<"b">
type DistributeLiterals<T extends string | number | symbol> = T extends T
    ? T extends string | number
        ? TLiteral<T>
        : never
    : never;

export interface TKeyOfEnum<T extends Record<string, string | number>> extends TUnion<
    TLiteral<string | number>[]
> {
    static: DistributeLiterals<keyof T>['static'];
    [Hint]: 'KeyOfEnum';
}

export class KeyofEnumBuilder extends JavaScriptTypeBuilder {
    KeyOfEnum<T extends Record<string, string | number>>(
        schema: T,
        options?: SchemaOptions,
    ): TKeyOfEnum<T> {
        const keys = Object.keys(schema).map(key => this.Literal(key));

        return this.Union(keys, { ...options, [Hint]: 'KeyOfEnum' }) as TKeyOfEnum<T>;
    }

    Enum<V extends TEnumValue, T extends Record<TEnumKey, V>>(
        schema: T,
        options?: SchemaOptions,
    ): TEnum<T> {
        const anyOf = Object.entries(schema)
            .filter(([key, _value]) => typeof key === 'string' || !isNaN(key))
            .map(([key, value]) => this.Literal(value, { $id: key }));

        return this.Union(anyOf, { ...options, [Hint]: 'Enum' }) as TEnum<T>;
    }
}
