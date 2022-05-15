<script>
  import Alert from "./lib/Alert.svelte";
  import Input from "./lib/Input.svelte";
  import Badge from "./lib/Badge.svelte";
  import { UserIcon } from "svelte-feather-icons";
  import Button from "./lib/Button.svelte";
  import Checkbox from "./lib/Checkbox.svelte";
  import SupabaseUi from "./lib/SupabaseUi.svelte";
  import Typography from "./lib/Typography.svelte";
  import Card from "./lib/Card.svelte";
  import Text from "./lib/Text.svelte";

  let theme;
</script>

<SupabaseUi {theme}>
  <div
    class="m-4 text-center"
    on:click={() => {
      if (theme == "dark") {
        theme = "light";
      } else {
        theme = "dark";
      }

      console.log("clicied");
    }}
  >
    <Typography variant="h1">svelte supabase ui</Typography>
  </div>
  <span class="m-2">
    <Typography variant="h2">Badge</Typography>
  </span>
  <br />
  <div class="m-4">
    {#each ["success", "no variant", "warning", "danger", "info"] as color}
      <Badge large={true} closable={true} variant={color}>
        {color}
      </Badge>
    {/each}
  </div>

  <span class="m-2">
    <Typography variant="h2">Alert</Typography>
  </span>
  <div class="m-4">
    {#each ["success", "warning", "danger", "info"] as color}
      <div>
        <Alert variant={color} withIcon={true} closable={true}>
          <div slot="title">{color} class</div>
          <div slot="description">
            this was formed with the {color} class in the alert component in varient
            prop.
          </div>
        </Alert>
      </div>
      <br />
    {/each}
  </div>
  <span class="m-2">
    <Typography variant="h2">Inputs</Typography>
  </span>
  <div class="m-4">
    {#each ["success", "warning", "danger", "info"] as color}
      <Input
        style="margin:10px;"
        variant={color}
        value="{color} input"
        placeholder="placeholder"
        type="text"
      />
    {/each}
    <Input
      size="xlarge"
      icon={UserIcon}
      style="margin:10px;"
      variant={"success"}
      value="with icon"
      placeholder="placeholder"
      type="text"
    />
  </div>

  <span class="m-2">
    <Typography variant="h2">Buttons</Typography>
  </span>
  <div class="m-4">
    {#each ["success", "warning", "danger"] as color}
      <Button style="margin: 10px;" variant={color}>
        {color} variant
      </Button>
      <br />
    {/each}
  </div>

  <span class="m-2">
    <Typography variant="h2">Checkbox</Typography>
  </span>
  <div class="m-4">
    <Checkbox>
      <div slot="label">label</div>
      <div slot="description">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Ducimus,
        temporibus. Illo vitae sint iste sit esse pariatur, qui deserunt, autem
        maxime odio at voluptas incidunt odit ullam? Commodi, vitae voluptates!
      </div>
    </Checkbox>
  </div>

  <span class="m-2">
    <Typography variant="h2">Typography</Typography>
  </span>
  <div class="m-4 shadow-md rounded">
    {#each ["h1", "h2", "h3", "h4", "h5", "h6"] as variants}
      <span class="m-1">
        <Typography variant={variants}>Heading {variants}</Typography>
      </span>
    {/each}
  </div>

  <span class="m-2">
    <Typography variant="h2">Card</Typography>
  </span>
  <div class="m-4 shadow-md rounded">
    <Card hoverable={true}>
      <span slot="more-title"> learn more </span>
      <span slot="title"> title </span>
      <span slot="image">
        <img
          src="https://images.unsplash.com/photo-1503424886307-b090341d25d1?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxleHBsb3JlLWZlZWR8Mnx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=60"
          class="rounded m-2"
          alt=""
        />
      </span>
      <span slot="description">
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Aperiam
        praesentium ex cumque minus ab sed expedita corporis! Earum illo cum
        expedita, eum quam cupiditate, ratione odio, illum officiis laudantium
        sequi! Corporis nihil tempore neque, mollitia ut cumque corrupti
        provident non incidunt autem accusamus rem eius? Voluptatibus, voluptate
        excepturi. Explicabo sit corrupti ipsam tenetur consequuntur. Ullam
        pariatur temporibus optio exercitationem magni!
      </span>
      <div slot="actions">
        <Button size="large" variant="success">Go to site</Button>
      </div>
    </Card>
  </div>

  <span class="m-2">
    <Typography variant="h2">Text</Typography>
  </span>
  <div class="m-4">
    {#each ["success", "warning", "danger", "disabled", "secondary", "mark", "kbd", "strikethrough", "underline", "code", "small", "strong"] as color}
      <Text style="margin: 10px;" variant={color}>
        {color} variant
      </Text>
      <br />
    {/each}
  </div>
</SupabaseUi>

<style global lang="postcss">
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  @tailwind variants;

  html,
  body {
    padding: 1px;
  }
</style>
