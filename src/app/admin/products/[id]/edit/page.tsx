import PageHeader from "@/app/admin/_components/PageHeader";
import ProductForm from "../../_components/ProductForm";
import prisma from "@/db/db";

export default async function EditProductPage({
  params: { id },
}: {
  params: { id: string };
}) {
    const product = await prisma.product.findUnique({where:
        {id}
    })
  return (
    <div>
      <PageHeader>Add Product</PageHeader>
      <ProductForm product={product} ></ProductForm>
    </div>
  );
}
