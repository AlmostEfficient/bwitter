import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import User from '../components/User'

const UserPage: NextPage = () => {
	const router = useRouter()
	const { user } = router.query;
  if (typeof user !== 'string') {
    return (<></>)
  }
  return (
    <User id={user} />
  )
}

export default UserPage;
