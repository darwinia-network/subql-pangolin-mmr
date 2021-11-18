// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';


export class NodeEntity implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public position: number;

    public hash: string;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save NodeEntity entity without an ID");
        await store.set('NodeEntity', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove NodeEntity entity without an ID");
        await store.remove('NodeEntity', id.toString());
    }

    static async get(id:string): Promise<NodeEntity | undefined>{
        assert((id !== null && id !== undefined), "Cannot get NodeEntity entity without an ID");
        const record = await store.get('NodeEntity', id.toString());
        if (record){
            return NodeEntity.create(record);
        }else{
            return;
        }
    }



    static create(record: Partial<Omit<NodeEntity, FunctionPropertyNames<NodeEntity>>> & Entity): NodeEntity {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new NodeEntity(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
