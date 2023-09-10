import * as express from 'express';
import * as elements from "typed-html";
import {chevronDown, chevronRight} from 'lucide-static/lib';

const app = express()
app.use(express.urlencoded({extended: true}));
const port = 3000

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

type Asset = {
    id: number
    parentId?: number
    name: string
}

const assets: Asset[] = [
    {
        id: 1,
        name: "root"
    },
    {
        id: 2,
        parentId: 1,
        name: "child 1",
    },
    {
        id: 3,
        parentId: 1,
        name: "child 2",
    },
    {
        id: 4,
        parentId: 2,
        name: "grandchild 1",
    },
]

const getById = (id: number): Asset | undefined => {
    return assets.find(a => a.id === id);
}

const getAllByParentId = (parentId: number): Asset[] => {
    return assets.filter(a => a.parentId === parentId);
}

const BaseHtml = ({children}: elements.Children) => (
    <html>
    <head>
        <meta charset="UTF-8"></meta>
        <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
        ></meta>
        <script src="https://unpkg.com/htmx.org@1.9.5"></script>
        <script src="https://cdn.tailwindcss.com/3.3.3"></script>
    </head>
    <body>
    {children}
    </body>
    </html>
);


app.get('/', (req, res) => {
    res.send(<BaseHtml>
        <div class="h-screen flex">
            <div class="w-72 pt-4">
                <ExpandingTreeItem expanded={false} id={1}/>
            </div>
            <Separator/>
            <div class="flex-grow p-4">
                <Form/>
            </div>
        </div>
    </BaseHtml>)
})

app.get('/tree-item-expand', (req, res) => {
    const id = Number(req.query.id);
    const expanded = req.query.expanded == "true";
    res.send(
        <ExpandingTreeItem id={id} expanded={expanded} selected/>
    )
})

const ExpandingTreeItem = (props: { id: number, expanded?: boolean, selected?: boolean }) => {
    const {id, selected, expanded} = props;
    const get = `/tree-item-expand?id=${id}&expanded=${!expanded}`

    return <div
        hx-get={get}
        hx-trigger={`select-${id} from:body`}
        hx-swap="outerHTML"
    >
        <TreeItem id={id} selected={selected} expanded={expanded}/>
    </div>
}

const TreeItem = (props: { id: number, expanded?: boolean, selected?: boolean }) => {
    const {id, selected, expanded} = props;
    const childAssets = getAllByParentId(id);
    return (
        <div class="pl-4">
            <SelectingTreeButton id={id} expanded={expanded} selected={selected}/>
            {expanded ? childAssets.map(asset => (
                <ExpandingTreeItem expanded={false} id={asset.id} selected={false}/>
            )) : <span/>}
        </div>
    );
};

app.get('/tree-item-select', (req, res) => {
    const numberId = Number(req.query.id);
    const boolExpanded = req.query.expanded == "true";
    res.send(
        <SelectingTreeButton id={numberId} expanded={boolExpanded}/>
    )
})

const SelectingTreeButton = (props: { id: number, expanded?: boolean, selected?: boolean }) => {
    const {id, selected, expanded} = props;
    const refreshProps = selected ? {
        "hx-get": `/tree-item-select?id=${id}&expanded=${expanded}`,
        "hx-trigger": "newSelection from:body",
        "hx-swap": "outerHTML"
    } : {}
    return <div {...refreshProps}>
        <TreeButton id={id} selected={selected} expanded={expanded}/>
    </div>
}

const TreeButton = (props: { id: number, expanded?: boolean, selected?: boolean }) => {
    const {id, selected, expanded} = props;
    const asset = getById(id);
    return (
        <TreeButtonComponent
            hx-target="#form"
            hx-swap="outerHTML"
            hx-get={`/select/${id}`}
            selected={selected}
        >
            {expanded ? <div class="[&>svg]:w-3 [&>svg]h-3 mr-1">{chevronDown}</div> :
                <div class="[&>svg]:w-3 [&>svg]:h-3 mr-1">{chevronRight}</div>}
            {asset.name}
        </TreeButtonComponent>
    );
}

const Separator = ({children, ...attributes}: elements.Attributes) => {
    return (
        <div class="shrink-0 bg-gray-100 h-full w-[1px]" {...attributes}>
            {children}
        </div>
    );
};

app.get('/select/:id', (req, res) => {
    const id = Number(req.params.id);
    const asset = getById(id);
    res.set("HX-Trigger", JSON.stringify({
        [`select-${id}`]: true,
        ["newSelection"]: true
    }));
    res.send(
        <Form asset={asset}/>
    )
})

const Form = (props: { asset?: Asset }) => {
    const {asset} = props;

    return <form id="form" class="space-y-4">
        <div class="space-y-2">
            <Label>Name</Label>
            <Input type="text" name="firstName" value={asset?.name ?? ""}/>
        </div>
        <Button>submit</Button>
    </form>
}


const Input = (attributes: elements.Attributes) => {
    return (
        <input
            class="border-input flex h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2"
            {...attributes}
        />
    );
};

const Label = ({children, ...attributes}: elements.Attributes) => {
    return (
        <label class="text-sm font-medium leading-none" {...attributes}>
            {children}
        </label>
    );
};

const Button = ({children, ...attributes}: elements.Attributes) => {
    return (
        <button
            class="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
            {...attributes}
        >
            {children}
        </button>
    );
};

const TreeButtonComponent = (props: elements.Attributes & elements.Children & { selected: boolean }) => {
    const {children, selected, ...attributes} = props;
    const bg = selected ? "bg-gray-200 hover:bg-gray-300" : "hover:bg-gray-100"
    return (
        <button
            class={`${bg} inline-flex h-8 items-center justify-center rounded-md px-4 text-sm font-medium text-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2`}
            {...attributes}
        >
            {children}
        </button>
    );
};
