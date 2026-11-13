import {createContext,useContext} from 'react';
import type {Data,Page,Application} from './types';
export type ContextValue={data:Data;workspace:'demo'|'personal';setWorkspace:(w:'demo'|'personal')=>void;reload:()=>Promise<void>;api:<T=unknown>(path:string,body?:unknown,method?:string)=>Promise<T>;navigate:(page:Page)=>void;notify:(text:string,error?:boolean)=>void;openApplication:(a:Application,stage?:string)=>void;openAdd:()=>void;search:string};
export const AppContext=createContext<ContextValue>(null!);
export const useApp=()=>useContext(AppContext);
