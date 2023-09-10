import * as express from 'express';
import * as elements from "typed-html";
import {chevronDown, chevronRight, plus} from 'lucide-static/lib';

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

let assets: Asset[] = [
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

const updateAsset = (asset: Asset) => {
    assets = assets.filter(a => a.id !== asset.id)
    assets.push(asset)
}

const createAsset = (asset: Asset) => {
    const newId = Math.max(...assets.map(a => a.id), 0) + 1;
    const newAsset = {
        ...asset,
        id: newId
    }
    assets.push(newAsset)

    return newAsset;
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
            <div class="w-72 pt-4 pr-4">
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
    const selected = req.query.selected == "true";
    res.send(
        <ExpandingTreeItem id={id} expanded={expanded} selected={selected}/>
    )
})

const ExpandingTreeItem = (props: { id: number, expanded?: boolean, selected?: boolean }) => {
    const {id, selected, expanded} = props;

    const newChildRefreshProps = selected ? {
        "hx-get": `/tree-item-expand?id=${id}&expanded=${expanded}&selected=false`,
        "hx-trigger": `newChild-${id} from:body`,
        "hx-target": "closest #expanding-tree-item",
        "hx-swap": "outerHTML",
    } : {}

    return <div
        id="expanding-tree-item"
        hx-get={`/tree-item-expand?id=${id}&expanded=${!expanded}&selected=true`}
        hx-trigger={`select-${id} from:body`}
        hx-swap="outerHTML"
        hx-target="this"
    >
        <div {...newChildRefreshProps}>
            <TreeItem id={id} selected={selected} expanded={expanded}/>
        </div>
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
        "hx-swap": "outerHTML",
        "hx-target": "this",
    } : {}
    return <div {...refreshProps}>
        <TreeButton id={id} selected={selected} expanded={expanded}/>
    </div>
}

const TreeButton = (props: { id: number, expanded?: boolean, selected?: boolean }) => {
    const {id, selected, expanded} = props;
    const bg = selected ? "bg-gray-200" : "hover:bg-gray-100"
    return (
        <div class={`flex rounded-md ${bg}`}>
            <div class="flex-1 min-w-0">
                <TreeButtonComponent
                    hx-target="#form"
                    hx-swap="outerHTML"
                    hx-get={`/select/${id}`}
                    selected={selected}
                >
                    {expanded ? <div class="[&>svg]:w-3 [&>svg]:h-3 mr-1">{chevronDown}</div> :
                        <div class="[&>svg]:w-3 [&>svg]:h-3 mr-1">{chevronRight}</div>}
                    <TreeLabel id={id}/>
                </TreeButtonComponent>
            </div>
            {selected ? <IconButton
                hx-target="#form"
                hx-swap="outerHTML"
                hx-get={`/select/${id}/newChild`}
            >
                {plus}
            </IconButton> : <span />}
        </div>
    );
}

const TreeLabel = (props: { id: number }) => {
    const {id} = props;
    const asset = getById(id);
    return (
        <div
            hx-get={`/label/${id}`}
            hx-trigger={`updated-${id} from:body`}
            hx-swap="outerHTML"
            hx-target="this"
            class="truncate"
        >
            {asset.name}
        </div>
    )
}

app.get('/label/:id', (req, res) => {
    const id = Number(req.params.id);
    res.send(<TreeLabel id={id}/>)
})


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
    res.send(<Form asset={asset}/>)
})

app.get('/select/:parentId/newChild', (req, res) => {
    const parentId = Number(req.params.parentId);
    res.send(<Form parentId={parentId}/>)
})

const Form = (props: { asset?: Asset, parentId?: number }) => {
    const {asset, parentId} = props;

    if (!asset && !parentId) {
        return <div id="form"/>
    }

    let postUrl = "";
    if (asset?.id) {
        postUrl = `/asset/${asset.id}`
    } else if (parentId) {
        postUrl = `/asset/${parentId}/newChild`
    }

    return <form id="form" hx-post={postUrl} hx-swap="outerHTML" class="space-y-4">
        <div class="space-y-2">
            <Label>Name</Label>
            <Input type="text" name="name" value={asset?.name ?? ""}/>
        </div>
        <Button>submit</Button>
    </form>
}

app.post("/asset/:id", (req, res) => {
    const id = Number(req.params.id)
    const asset = getById(id)

    const updatedAsset: Asset = {
        ...asset,
        name: req.body.name
    }
    updateAsset(updatedAsset);

    res.set("HX-Trigger", `updated-${id}`);
    res.send(<Form asset={updatedAsset}/>)
})

app.post("/asset/:parentId/newChild", (req, res) => {
    const parentId = Number(req.params.parentId)

    const newAsset: Asset = {
        id: 0,
        parentId: parentId,
        name: req.body.name,
    }
    const created = createAsset(newAsset);

    res.set("HX-Trigger", JSON.stringify({
        [`newChild-${parentId}`]: true
    }));

    res.send(<Form asset={created}/>)
})


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

const IconButton = ({children, ...attributes}: elements.Attributes) => {
    return (
        <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-md  text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 [&>svg]:w-3 [&>svg]:h-3 hover:bg-gray-300"
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
            class={`w-full inline-flex h-8 items-center rounded-md px-4 text-sm font-medium text-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2`}
            {...attributes}
        >
            {children}
        </button>
    );
};
