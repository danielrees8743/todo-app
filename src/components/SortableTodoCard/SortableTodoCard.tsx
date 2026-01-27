import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TodoCard, { type TodoCardProps } from '../TodoCard/TodoCard';

type SortableTodoCardProps = TodoCardProps;

export default function SortableTodoCard({ todo, ...props }: SortableTodoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className='touch-manipulation'
    >
      <TodoCard todo={todo} {...props} />
    </div>
  );
}
